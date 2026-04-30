-- ============================================================================
-- Migration: harden match_similar_bookmarks against NULL image_keywords
-- ============================================================================
-- Purpose:
--   Redefine public.match_similar_bookmarks so every jsonb_array_elements*
--   input is wrapped in COALESCE(expr, '[]'::jsonb). When a source or candidate
--   has meta_data.image_keywords missing, in the legacy bare-array shape
--   (pre-20260406), or with an absent sub-key (colors / object / type are all
--   optional in StructuredKeywords), the raw call raises
--   "cannot extract elements from a scalar" and a single sparse row fails the
--   entire RPC. Matches the pattern already used by sibling search RPCs
--   (20260415_lch_color_search_ranking.sql, 20260413_type_hints_search.sql).
--
-- The function body is otherwise unchanged from 20260421120000 — only the six
-- jsonb_array_elements* inputs are wrapped.
-- ============================================================================

begin;

create or replace function public.match_similar_bookmarks(
  p_bookmark_id bigint,
  p_min_score int default 4,
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
      e.meta_data -> 'image_keywords' -> 'object' as src_objects,
      e.meta_data -> 'image_keywords' -> 'type'   as src_ai_types,
      lower(substring(e.url from '(?:https?://)?(?:www\.)?([^/?#]+)')) as src_domain
    from public.everything e
    where e.id = p_bookmark_id
      and e.user_id = (select auth.uid())
  ),
  source_tag_ids as (
    select bt.tag_id
    from public.bookmark_tags bt, source s
    where bt.bookmark_id = p_bookmark_id
      and bt.user_id = s.user_id
  ),
  source_category_ids as (
    select bc.category_id
    from public.bookmark_categories bc, source s
    where bc.bookmark_id = p_bookmark_id
      and bc.user_id = s.user_id
  ),
  candidates as (
    -- No pre-filter here: any signal combination can reach p_min_score if the
    -- threshold is ever lowered. Filter is applied via the final score >= p_min_score
    -- guard. Re-evaluate with real RPC timings before adding a score-tied pre-filter.
    select
      e.id,
      e.inserted_at,
      e.meta_data -> 'image_keywords' as kw,
      lower(substring(e.url from '(?:https?://)?(?:www\.)?([^/?#]+)')) as domain
    from public.everything e, source s
    where e.user_id = s.user_id
      and e.trash is null
      and e.id <> s.id
  ),
  -- For each of the source's top-3 dominant colors, count it as a match if
  -- any candidate color clears the decayed quality floor:
  --     lch_color_score × exp(-0.4 × (candidate_pos − 1)) >= 0.50
  -- Same predicate used by public.search_bookmarks_url_tag_scope.
  color_scored as (
    select
      c.id,
      coalesce((
        select count(*)
        from jsonb_array_elements(coalesce(s.src_colors, '[]'::jsonb)) with ordinality as sc(color, ord)
        where sc.ord <= 3
          and exists (
            select 1
            from jsonb_array_elements(coalesce(c.kw -> 'colors', '[]'::jsonb)) with ordinality as cc(color, pos)
            where public.lch_color_score(
              (sc.color ->> 'l')::double precision,
              (sc.color ->> 'a')::double precision,
              (sc.color ->> 'b')::double precision,
              (cc.color ->> 'l')::double precision,
              (cc.color ->> 'a')::double precision,
              (cc.color ->> 'b')::double precision
            ) * exp(-0.4 * (cc.pos - 1)) >= 0.50
          )
      ), 0) as color_matches
    from candidates c, source s
  ),
  object_scored as (
    select
      c.id,
      coalesce((
        select count(*)
        from jsonb_array_elements_text(coalesce(s.src_objects, '[]'::jsonb)) as src_obj
        where src_obj in (
          select jsonb_array_elements_text(coalesce(c.kw -> 'object', '[]'::jsonb))
        )
      ), 0) as object_matches
    from candidates c, source s
  ),
  ai_type_scored as (
    select
      c.id,
      coalesce((
        select count(*)
        from jsonb_array_elements_text(coalesce(s.src_ai_types, '[]'::jsonb)) as src_type
        where src_type in (
          select jsonb_array_elements_text(coalesce(c.kw -> 'type', '[]'::jsonb))
        )
      ), 0) as ai_type_matches
    from candidates c, source s
  ),
  tag_scored as (
    select bt.bookmark_id as id, count(*) as tag_matches
    from public.bookmark_tags bt
    where bt.tag_id in (select tag_id from source_tag_ids)
      and bt.bookmark_id <> p_bookmark_id
    group by bt.bookmark_id
  ),
  category_scored as (
    select bc.bookmark_id as id, count(*) as category_matches
    from public.bookmark_categories bc
    where bc.category_id in (select category_id from source_category_ids)
      and bc.bookmark_id <> p_bookmark_id
    group by bc.bookmark_id
  ),
  domain_scored as (
    select
      c.id,
      case
        when s.src_domain is not null and c.domain = s.src_domain then 1
        else 0
      end as domain_match
    from candidates c, source s
  ),
  totals as (
    select
      c.id,
      c.inserted_at,
      (
        2 * coalesce(cs.color_matches,     0)
      + 3 * coalesce(os.object_matches,    0)
      + 3 * coalesce(ats.ai_type_matches,  0)
      + 2 * coalesce(ts.tag_matches,       0)
      + 1 * coalesce(cts.category_matches, 0)
      + 1 * coalesce(ds.domain_match,      0)
      )::int as score
    from candidates c
    left join color_scored    cs  on cs.id  = c.id
    left join object_scored   os  on os.id  = c.id
    left join ai_type_scored  ats on ats.id = c.id
    left join tag_scored      ts  on ts.id  = c.id
    left join category_scored cts on cts.id = c.id
    left join domain_scored   ds  on ds.id  = c.id
  )
  select t.id, t.score
  from totals t
  where t.score >= p_min_score
  order by t.score desc, t.inserted_at desc
  limit p_limit;
$$;

revoke execute on function public.match_similar_bookmarks(bigint, int, int) from public;
grant execute on function public.match_similar_bookmarks(bigint, int, int) to authenticated;

comment on function public.match_similar_bookmarks is
  'Ranks bookmarks similar to p_bookmark_id by additive score over AI-extracted visual signals (OKLCh colors via lch_color_score with positional-decay quality floor matching color search, objects, content types), user tags/categories, and url host equality. User-scoped via RLS on public.everything. jsonb_array_elements* inputs guarded with coalesce(expr, ''[]''::jsonb) so sparse image_keywords do not fail the whole RPC.';

commit;
