-- ============================================================================
-- Migration: Add type_hints search parameter
-- ============================================================================
-- Purpose:
--   Add `type_hints text[]` parameter to search_bookmarks_url_tag_scope.
--   A bookmark matches a type hint when it has a user-created tag with that
--   name (precedence) OR its AI-extracted image_keywords.type contains it.
--   Tag-matched rows sort above type-only matches.
-- ============================================================================

begin;

-- Drop old 5-parameter overload (CREATE OR REPLACE with different params creates
-- a new overload in PostgreSQL, it does NOT replace the existing one)
drop function if exists public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb
);

create or replace function public.search_bookmarks_url_tag_scope(
  search_text character varying default '',
  url_scope character varying default '',
  tag_scope text[] default null,
  category_scope bigint default null,
  color_hints jsonb default '[]'::jsonb,
  type_hints text[] default null
)
returns table(
  id bigint,
  user_id uuid,
  inserted_at timestamp with time zone,
  title extensions.citext,
  url text,
  description text,
  ogimage text,
  screenshot text,
  trash timestamp with time zone,
  type text,
  meta_data jsonb,
  sort_index text,
  added_tags jsonb,
  added_categories jsonb,
  make_discoverable timestamp with time zone
)
language plpgsql
volatile
security invoker
set search_path = public, extensions
as $function$
begin
  set local pg_trgm.similarity_threshold = 0.6;

  return query
  with
    bookmark_tags_agg as (
      select
        bt.bookmark_id,
        bt.user_id,
        jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) as tags_json
      from public.bookmark_tags bt
      join public.tags t on t.id = bt.tag_id
      group by bt.bookmark_id, bt.user_id
    ),
    bookmark_cats_agg as (
      select
        bc.bookmark_id,
        bc.user_id,
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'category_name', c.category_name,
            'category_slug', c.category_slug,
            'icon', c.icon,
            'icon_color', c.icon_color
          )
          order by bc.created_at asc
        ) as categories_json
      from public.bookmark_categories bc
      join public.categories c on c.id = bc.category_id
      group by bc.bookmark_id, bc.user_id
    )
  select
    b.id,
    b.user_id,
    b.inserted_at,
    b.title,
    b.url,
    b.description,
    b."ogImage",
    b.screenshot,
    b.trash,
    b.type,
    b.meta_data,
    b.sort_index,
    coalesce(bta.tags_json, '[]'::jsonb) as added_tags,
    coalesce(bca.categories_json, '[]'::jsonb) as added_categories,
    b.make_discoverable
  from public.everything b
  left join bookmark_tags_agg bta on bta.bookmark_id = b.id and bta.user_id = b.user_id
  left join bookmark_cats_agg bca on bca.bookmark_id = b.id and bca.user_id = b.user_id
  where
    (
      url_scope is null
      or url_scope = ''
      or b.url ilike '%' || url_scope || '%'
    )
    and
    (
      tag_scope is null
      or array_length(tag_scope, 1) is null
      or (
        select count(distinct lower(t.name))
        from public.bookmark_tags bt
        join public.tags t on t.id = bt.tag_id
        where bt.bookmark_id = b.id
          and lower(t.name) = any(select lower(unnest(tag_scope)))
      ) = (
        select count(distinct lower(tag))
        from unnest(tag_scope) as tag
      )
    )
    and
    (
      category_scope is null
      or exists (
        select 1
        from public.bookmark_categories bc
        where bc.bookmark_id = b.id
          and bc.category_id = category_scope
      )
    )
    and
    (
      search_text is null
      or btrim(search_text) = ''
      or not exists (
        select 1
        from unnest(string_to_array(lower(btrim(search_text)), ' ')) as token
        where token <> ''
          and not (
            token % any(
              string_to_array(
                lower(coalesce(b.title::text, '') || ' ' || coalesce(b.description, '')),
                ' '
              )
            )
            or lower(coalesce(b.url, '')) like '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' escape '\'
            or exists (
              select 1
              from jsonb_each_text(coalesce(b.meta_data, '{}'::jsonb)) as x(key, value)
              where key in ('img_caption', 'image_caption', 'ocr')
                and lower(value) like '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' escape '\'
            )
            or exists (
              select 1
              from public.extract_keywords_text(b.meta_data->'image_keywords') as kw
              where lower(kw.keyword) like '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' escape '\'
            )
          )
      )
    )
    and
    (
      jsonb_array_length(color_hints) = 0
      or exists (
        select 1
        from jsonb_array_elements(color_hints) as hint
        where
          exists (
            select 1
            from public.bookmark_tags bt
            join public.tags t on t.id = bt.tag_id
            where bt.bookmark_id = b.id
              and lower(t.name) = lower(hint->>'tag_name')
          )
          or public.color_matches_oklab(
            b.meta_data->'image_keywords'->'colors',
            (hint->>'l')::float,
            (hint->>'a')::float,
            (hint->>'b')::float
          )
      )
    )
    -- Type hints: match bookmark if it has a tag with that name OR image_keywords.type contains it
    and
    (
      type_hints is null
      or array_length(type_hints, 1) is null
      or exists (
        select 1
        from unnest(type_hints) as hint
        where
          exists (
            select 1
            from public.bookmark_tags bt
            join public.tags t on t.id = bt.tag_id
            where bt.bookmark_id = b.id
              and lower(t.name) = lower(hint)
          )
          or exists (
            select 1
            from jsonb_array_elements_text(
              coalesce(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
            ) as t_val
            where lower(t_val) = lower(hint)
          )
      )
    )

  order by
    -- Tier 1: Color hint tag matches first
    case
      when jsonb_array_length(color_hints) = 0 then 0
      when exists (
        select 1
        from jsonb_array_elements(color_hints) as hint
        join public.bookmark_tags bt on bt.bookmark_id = b.id
        join public.tags t on t.id = bt.tag_id
        where lower(t.name) = lower(hint->>'tag_name')
      ) then 1
      else 0
    end desc,
    -- Tier 2: Type hint precedence — tag match (2) > type-only match (1) > no match (0)
    case
      when type_hints is null or array_length(type_hints, 1) is null then 0
      when exists (
        select 1
        from unnest(type_hints) as hint
        join public.bookmark_tags bt on bt.bookmark_id = b.id
        join public.tags t on t.id = bt.tag_id
        where lower(t.name) = lower(hint)
      ) then 2
      when exists (
        select 1
        from unnest(type_hints) as hint,
        jsonb_array_elements_text(
          coalesce(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
        ) as t_val
        where lower(t_val) = lower(hint)
      ) then 1
      else 0
    end desc,
    -- Tier 3: Similarity + color distance scoring
    (
      case
        when search_text is null or btrim(search_text) = '' then 0
        else (
          similarity(coalesce(b.url, ''), btrim(search_text)) * 0.6 +
          similarity(coalesce(b.title::text, ''), btrim(search_text)) * 0.5 +
          similarity(coalesce(b.description, ''), btrim(search_text)) * 0.3 +
          similarity(coalesce(b.meta_data->>'ocr', ''), btrim(search_text)) * 0.1 +
          similarity(coalesce(b.meta_data->>'img_caption', ''), btrim(search_text)) * 0.15 +
          similarity(coalesce(b.meta_data->>'image_caption', ''), btrim(search_text)) * 0.15 +
          similarity(
            coalesce(
              (select string_agg(kw.keyword, ' ') from public.extract_keywords_text(b.meta_data->'image_keywords') as kw),
              ''
            ),
            btrim(search_text)
          ) * 0.1
        )
      end
      +
      case
        when jsonb_array_length(color_hints) = 0 then 0
        else coalesce(
          (
            select max(
              case when sqrt(power((hint->>'a')::float, 2) + power((hint->>'b')::float, 2)) < 0.04 then
                case when sqrt(power((c.val->>'a')::float, 2) + power((c.val->>'b')::float, 2)) < 0.04
                  and abs((hint->>'l')::float - (c.val->>'l')::float) < 0.15
                then (1.0 - abs((hint->>'l')::float - (c.val->>'l')::float)) * (1.0 / c.pos)
                else 0 end
              else
                case when sqrt(
                  power((hint->>'l')::float - (c.val->>'l')::float, 2) +
                  power((hint->>'a')::float - (c.val->>'a')::float, 2) +
                  power((hint->>'b')::float - (c.val->>'b')::float, 2)
                ) < case
                  when c.pos = 1 then 0.30
                  when c.pos = 2 then 0.25
                  else 0.18
                end
                then greatest(0, 1.0 - sqrt(
                  power((hint->>'l')::float - (c.val->>'l')::float, 2) +
                  power((hint->>'a')::float - (c.val->>'a')::float, 2) +
                  power((hint->>'b')::float - (c.val->>'b')::float, 2)
                )) * (1.0 / c.pos)
                else 0 end
              end
            )
            from jsonb_array_elements(color_hints) as hint
            cross join jsonb_array_elements(coalesce(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)) with ordinality as c(val, pos)
          ),
          0
        )
      end
    ) desc,
    b.inserted_at desc;
end;
$function$;

comment on function public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) is
  'Bookmark search with URL/tag/category/color/type filters. Type hints match bookmarks that have a user-created tag with that name (sorted first) OR whose AI-extracted image_keywords.type contains the value. Tag-matched rows always sort above type-only matches.';

-- Verification
do $$
declare
  v_exists int;
begin
  select count(*) into v_exists
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'search_bookmarks_url_tag_scope'
    and pg_get_function_identity_arguments(p.oid) =
      'search_text character varying, url_scope character varying, tag_scope text[], category_scope bigint, color_hints jsonb, type_hints text[]';

  if v_exists = 0 then
    raise exception 'search_bookmarks_url_tag_scope with type_hints parameter not created';
  end if;

  raise notice 'Verification passed: search function with type_hints present';
end $$;

commit;
