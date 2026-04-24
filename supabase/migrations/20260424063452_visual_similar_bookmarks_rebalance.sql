-- ============================================================================
-- Migration: visual_similar_bookmarks_rebalance
-- ============================================================================
-- Purpose:
--   Rebalance match_similar_bookmarks from a topical-leaning scorer into a
--   visual + entity look-alike ranker. Drops tag and category signals
--   (purely topical). Keeps and up-weights color (OKLAB/OKLCh). Keeps type.
--   Re-adds object + people. Keeps domain as a low-weight "same-site"
--   signal. Adds two unified buckets from features jsonb:
--   creator (brand/author/artist/director/company/character/series) and
--   classifier (platform/source/programming_language/framework/genre/location).
--   Aspect-ratio stays a NULL-tolerant hard filter.
--
-- Scoring (per candidate Y vs. source X, both owned by current user):
--   score =  6 × color_matches       -- source top-3 colors, positional decay
--                                       quality floor mirrors color search
--         +  3 × type_binary         -- 1 if any lowered image_keywords.type
--                                       intersects, else 0
--         +  4 × object_binary       -- 1 if any lowered image_keywords.object
--                                       intersects, else 0
--         +  8 × people_binary       -- 1 if any lowered image_keywords.people
--                                       intersects, else 0
--         +  5 × creator_binary      -- 1 if any shared value across features
--                                       keys: brand/author/artist/director/
--                                       company/character/series
--         +  2 × classifier_binary   -- 1 if any shared value across features
--                                       keys: platform/source/programming_
--                                       language/framework/genre/location
--         +  2 × domain_binary       -- 1 if same url host (www. stripped,
--                                       case-insensitive), else 0
--
--   Max score: 42 (18 + 3 + 4 + 8 + 5 + 2 + 2).
--
-- Filter:
--   - aspect bucket must match when both sides have dimensions
--     (portrait / landscape / square, 1.15x cutoff). If either side is
--     NULL, skip the filter.
--   - score >= p_min_score (default 3). Any single weak signal clears it.
--
-- Ordering (within and across score buckets):
--   1. score                    DESC  -- coarse bucket
--   2. color_continuous         DESC  -- sum of best decayed LCH similarity
--   3. aspect_similarity        DESC  -- 1 / (1 + |ln(w/h) delta|)
--   4. people_overlap_count     DESC  -- multi-person overlap within binary
--   5. creator_overlap_count    DESC  -- multi-creator overlap within binary
--   6. object_overlap_count     DESC  -- multi-object overlap within binary
--   7. classifier_overlap_count DESC  -- multi-classifier overlap within binary
--   8. type_overlap_count       DESC  -- multi-type overlap within binary
--   9. domain_match             DESC  -- same-domain prefers (binary)
--  10. inserted_at              DESC  -- recency fallback
--
-- RLS: SECURITY INVOKER. Row access gated by RLS on public.everything.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Helper: aspect_bucket_from_meta
--   Classify image aspect ratio into portrait / landscape / square. Reads
--   width/height from meta_data jsonb. NULL-tolerant: returns NULL when
--   dimensions are missing, non-numeric, or zero. 1.15x threshold separates
--   square-ish from oriented.
-- ----------------------------------------------------------------------------
create or replace function public.aspect_bucket_from_meta(meta jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    case
      when meta is null                                                then null
      when (meta->>'width')  is null or (meta->>'height') is null     then null
      when (meta->>'width') !~ '^\d+$' or (meta->>'height') !~ '^\d+$' then null
      when (meta->>'width')::int  <= 0 or (meta->>'height')::int  <= 0 then null
      when (meta->>'height')::numeric / (meta->>'width')::numeric  > 1.15 then 'portrait'
      when (meta->>'width')::numeric  / (meta->>'height')::numeric > 1.15 then 'landscape'
      else 'square'
    end;
$$;

revoke execute on function public.aspect_bucket_from_meta(jsonb) from public;
grant  execute on function public.aspect_bucket_from_meta(jsonb) to authenticated;

comment on function public.aspect_bucket_from_meta(jsonb) is
  'Classify image aspect ratio from meta_data jsonb into portrait / landscape / square. 1.15x cutoff. Returns NULL if width/height missing, non-numeric, or zero. Used by match_similar_bookmarks.';

-- ----------------------------------------------------------------------------
-- Helper: features_text_values
--   Flatten text values from meta_data.image_keywords.features[<keys>] into a
--   deduped, lowercased text[]. Handles both string-valued and array-valued
--   keys. NULL-tolerant. Used by match_similar_bookmarks for creator and
--   classifier bucket overlaps.
-- ----------------------------------------------------------------------------
create or replace function public.features_text_values(features jsonb, keys text[])
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(distinct lower(v)), array[]::text[])
  from (
    select features->>k as v
    from unnest(keys) as k
    where jsonb_typeof(features->k) = 'string'
    union all
    select jsonb_array_elements_text(features->k) as v
    from unnest(keys) as k
    where jsonb_typeof(features->k) = 'array'
  ) t
  where v is not null and v <> '';
$$;

revoke execute on function public.features_text_values(jsonb, text[]) from public;
grant  execute on function public.features_text_values(jsonb, text[]) to authenticated;

comment on function public.features_text_values(jsonb, text[]) is
  'Flatten text values from meta_data.image_keywords.features[<keys>] into a deduped, lowercased text[]. Handles both string-valued and array-valued keys. Used by match_similar_bookmarks for creator/classifier bucket overlaps.';

-- ----------------------------------------------------------------------------
-- match_similar_bookmarks — visual + entity look-alike ranker
--   Same signature as 20260421120000. Grants preserved by CREATE OR REPLACE.
-- ----------------------------------------------------------------------------
create or replace function public.match_similar_bookmarks(
  p_bookmark_id bigint,
  p_min_score int default 3,
  p_limit int default 50
)
returns table (
  id bigint,
  score int
)
language sql
security invoker
stable
set search_path = ''
as $$
  with source as (
    select
      e.id,
      e.user_id,
      e.meta_data -> 'image_keywords' -> 'colors' as src_colors,
      e.meta_data -> 'image_keywords' -> 'type'   as src_ai_types,
      e.meta_data -> 'image_keywords' -> 'object' as src_objects,
      e.meta_data -> 'image_keywords' -> 'people' as src_people,
      public.features_text_values(
        e.meta_data -> 'image_keywords' -> 'features',
        array['brand','author','artist','director','company','character','series']
      ) as src_creator_values,
      public.features_text_values(
        e.meta_data -> 'image_keywords' -> 'features',
        array['platform','source','programming_language','framework','genre','location']
      ) as src_classifier_values,
      lower(substring(e.url from '(?:https?://)?(?:www\.)?([^/?#]+)')) as src_domain,
      public.aspect_bucket_from_meta(e.meta_data) as src_aspect_bucket,
      case
        when (e.meta_data->>'width')  ~ '^\d+$' and (e.meta_data->>'height') ~ '^\d+$'
         and (e.meta_data->>'width')::int > 0 and (e.meta_data->>'height')::int > 0
        then ln((e.meta_data->>'width')::numeric / (e.meta_data->>'height')::numeric)
        else null
      end as src_log_aspect
    from public.everything e
    where e.id = p_bookmark_id
      and e.user_id = (select auth.uid())
  ),
  candidates as (
    select
      e.id,
      e.inserted_at,
      e.meta_data -> 'image_keywords' as kw,
      e.meta_data -> 'image_keywords' -> 'features' as candidate_features,
      lower(substring(e.url from '(?:https?://)?(?:www\.)?([^/?#]+)')) as candidate_domain,
      public.aspect_bucket_from_meta(e.meta_data) as aspect_bucket,
      case
        when (e.meta_data->>'width')  ~ '^\d+$' and (e.meta_data->>'height') ~ '^\d+$'
         and (e.meta_data->>'width')::int > 0 and (e.meta_data->>'height')::int > 0
        then ln((e.meta_data->>'width')::numeric / (e.meta_data->>'height')::numeric)
        else null
      end as candidate_log_aspect
    from public.everything e, source s
    where e.user_id = s.user_id
      and e.trash is null
      and e.id <> s.id
  ),
  scored as (
    select
      c.id,
      c.inserted_at,
      c.aspect_bucket,
      s.src_aspect_bucket,
      case
        when s.src_log_aspect is null or c.candidate_log_aspect is null then null
        else 1.0 / (1.0 + abs(s.src_log_aspect - c.candidate_log_aspect))
      end as aspect_similarity,
      coalesce((
        select count(*)
        from jsonb_array_elements(s.src_colors) with ordinality as sc(color, ord)
        where sc.ord <= 3
          and exists (
            select 1
            from jsonb_array_elements(c.kw -> 'colors') with ordinality as cc(color, pos)
            where public.lch_color_score(
              (sc.color ->> 'l')::double precision,
              (sc.color ->> 'a')::double precision,
              (sc.color ->> 'b')::double precision,
              (cc.color ->> 'l')::double precision,
              (cc.color ->> 'a')::double precision,
              (cc.color ->> 'b')::double precision
            ) * exp(-0.4 * (cc.pos - 1)) >= 0.50
          )
      ), 0) as color_matches,
      coalesce((
        select sum(best_score)
        from (
          select sc.ord,
                 max(
                   public.lch_color_score(
                     (sc.color ->> 'l')::double precision,
                     (sc.color ->> 'a')::double precision,
                     (sc.color ->> 'b')::double precision,
                     (cc.color ->> 'l')::double precision,
                     (cc.color ->> 'a')::double precision,
                     (cc.color ->> 'b')::double precision
                   ) * exp(-0.4 * (cc.pos - 1))
                 ) as best_score
          from jsonb_array_elements(s.src_colors) with ordinality as sc(color, ord),
               jsonb_array_elements(c.kw -> 'colors') with ordinality as cc(color, pos)
          where sc.ord <= 3
          group by sc.ord
        ) per_src_color
      ), 0) as color_continuous,
      coalesce((
        select count(*)
        from jsonb_array_elements_text(s.src_ai_types) as src_type
        where lower(src_type) in (
          select lower(jsonb_array_elements_text(c.kw -> 'type'))
        )
      ), 0) as type_overlap_count,
      coalesce((
        select count(*)
        from jsonb_array_elements_text(s.src_objects) as src_obj
        where lower(src_obj) in (
          select lower(jsonb_array_elements_text(c.kw -> 'object'))
        )
      ), 0) as object_overlap_count,
      coalesce((
        select count(*)
        from jsonb_array_elements_text(s.src_people) as src_per
        where lower(src_per) in (
          select lower(jsonb_array_elements_text(c.kw -> 'people'))
        )
      ), 0) as people_overlap_count,
      -- Creator bucket overlap (brand/author/artist/director/company/character/series)
      (select count(*) from (
        select unnest(s.src_creator_values)
        intersect
        select unnest(public.features_text_values(
          c.candidate_features,
          array['brand','author','artist','director','company','character','series']
        ))
      ) t) as creator_overlap_count,
      -- Classifier bucket overlap (platform/source/programming_language/framework/genre/location)
      (select count(*) from (
        select unnest(s.src_classifier_values)
        intersect
        select unnest(public.features_text_values(
          c.candidate_features,
          array['platform','source','programming_language','framework','genre','location']
        ))
      ) t) as classifier_overlap_count,
      -- Domain match: same url host (www. stripped, case-insensitive)
      case
        when s.src_domain is not null and c.candidate_domain is not null
         and s.src_domain = c.candidate_domain then 1
        else 0
      end as domain_match
    from candidates c, source s
  )
  select
    sc.id,
    (
      6 * sc.color_matches
      + 3 * case when sc.type_overlap_count       > 0 then 1 else 0 end
      + 4 * case when sc.object_overlap_count     > 0 then 1 else 0 end
      + 8 * case when sc.people_overlap_count     > 0 then 1 else 0 end
      + 5 * case when sc.creator_overlap_count    > 0 then 1 else 0 end
      + 2 * case when sc.classifier_overlap_count > 0 then 1 else 0 end
      + 2 * sc.domain_match
    )::int as score
  from scored sc
  where
    (sc.src_aspect_bucket is null
      or sc.aspect_bucket is null
      or sc.src_aspect_bucket = sc.aspect_bucket)
    and (
      6 * sc.color_matches
      + 3 * case when sc.type_overlap_count       > 0 then 1 else 0 end
      + 4 * case when sc.object_overlap_count     > 0 then 1 else 0 end
      + 8 * case when sc.people_overlap_count     > 0 then 1 else 0 end
      + 5 * case when sc.creator_overlap_count    > 0 then 1 else 0 end
      + 2 * case when sc.classifier_overlap_count > 0 then 1 else 0 end
      + 2 * sc.domain_match
    ) >= p_min_score
  order by
    (6 * sc.color_matches
     + 3 * case when sc.type_overlap_count       > 0 then 1 else 0 end
     + 4 * case when sc.object_overlap_count     > 0 then 1 else 0 end
     + 8 * case when sc.people_overlap_count     > 0 then 1 else 0 end
     + 5 * case when sc.creator_overlap_count    > 0 then 1 else 0 end
     + 2 * case when sc.classifier_overlap_count > 0 then 1 else 0 end
     + 2 * sc.domain_match) desc,
    sc.color_continuous desc,
    sc.aspect_similarity desc nulls last,
    sc.people_overlap_count desc,
    sc.creator_overlap_count desc,
    sc.object_overlap_count desc,
    sc.classifier_overlap_count desc,
    sc.type_overlap_count desc,
    sc.domain_match desc,
    sc.inserted_at desc
  limit p_limit;
$$;

comment on function public.match_similar_bookmarks is
  'Visual + entity look-alike ranker. Score = 6·color_matches + 3·type_binary + 4·object_binary + 8·people_binary + 5·creator_binary + 2·classifier_binary + 2·domain_binary, max 42. Creator bucket unifies features.{brand,author,artist,director,company,character,series}; classifier bucket unifies features.{platform,source,programming_language,framework,genre,location}. Aspect-ratio bucket is a NULL-tolerant hard filter. Within-bucket ordering uses continuous color quality, continuous aspect similarity, then overlap counts (people → creator → object → classifier → type → domain). User-scoped via RLS on public.everything.';

-- ----------------------------------------------------------------------------
-- Smoke test (minimal reference pattern — 20260413050000 style):
-- existence + signature + helper math. No public.everything fixture synthesis.
-- ----------------------------------------------------------------------------
do $$
begin
  if public.aspect_bucket_from_meta('{"width":"100","height":"100"}'::jsonb) is distinct from 'square' then
    raise exception 'aspect_bucket_from_meta square failed';
  end if;
  if public.aspect_bucket_from_meta('{"width":"100","height":"200"}'::jsonb) is distinct from 'portrait' then
    raise exception 'aspect_bucket_from_meta portrait failed';
  end if;
  if public.aspect_bucket_from_meta('{"width":"300","height":"100"}'::jsonb) is distinct from 'landscape' then
    raise exception 'aspect_bucket_from_meta landscape failed';
  end if;
  if public.aspect_bucket_from_meta('{}'::jsonb) is not null then
    raise exception 'aspect_bucket_from_meta null-input failed';
  end if;
  if public.aspect_bucket_from_meta('{"width":"auto","height":"100"}'::jsonb) is not null then
    raise exception 'aspect_bucket_from_meta non-numeric guard failed';
  end if;

  perform 1 from pg_proc
    where proname = 'match_similar_bookmarks' and pronargs = 3;
  if not found then
    raise exception 'match_similar_bookmarks not replaced';
  end if;

  raise notice 'Verification passed: match_similar_bookmarks rebalanced (visual + entity look-alike)';
end $$;

commit;
