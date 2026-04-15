-- ============================================================================
-- MIGRATION: Drop everything.screenshot column
-- Created: 2026-04-15
-- Purpose:
--   * Column is unused: 0/26,079 non-null rows on dev, no live writers, no
--     readers outside the response-shape boundary.
--   * The v2 screenshot queue writes `ogImage` only; legacy v1 handler is
--     deprecated. Six upload code paths write `screenshot: null` (dead writes).
--   * Removing the column lets every search RPC, Zod schema, manual TS type,
--     and OpenAPI example collapse to the real shape.
-- Notes:
--   * `search_bookmarks_url_tag_scope` projects `b.screenshot` and declares
--     `screenshot text` in its RETURNS TABLE clause — the return signature
--     must change, so CREATE OR REPLACE cannot be used; drop then recreate.
--   * Body lifted from 20260413050000_type_hints_search.sql with two edits:
--       - remove `screenshot text,` from RETURNS TABLE(...)
--       - remove `b.screenshot,` from the SELECT list
--     No other changes to WHERE, ORDER BY, joins, or CTEs.
--   * `DROP FUNCTION` drops all grants, so re-GRANT to anon, authenticated
--     after recreate (matches the prior grant pattern from
--     20260413043607_color_hints_search.sql).
-- ============================================================================

BEGIN;

-- PART 1: Drop the dependent search RPC (return signature is changing)
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb, text[]
);

-- PART 2: Drop the column
ALTER TABLE public.everything DROP COLUMN IF EXISTS screenshot;

-- PART 3: Recreate the search RPC without screenshot in the projection
CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
  search_text character varying DEFAULT '',
  url_scope character varying DEFAULT '',
  tag_scope text[] DEFAULT NULL,
  category_scope bigint DEFAULT NULL,
  color_hints jsonb DEFAULT '[]'::jsonb,
  type_hints text[] DEFAULT NULL
)
RETURNS TABLE(
  id bigint,
  user_id uuid,
  inserted_at timestamp with time zone,
  title extensions.citext,
  url text,
  description text,
  ogimage text,
  trash timestamp with time zone,
  type text,
  meta_data jsonb,
  sort_index text,
  added_tags jsonb,
  added_categories jsonb,
  make_discoverable timestamp with time zone
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
  SET LOCAL pg_trgm.similarity_threshold = 0.6;

  RETURN QUERY
  WITH
    bookmark_tags_agg AS (
      SELECT
        bt.bookmark_id,
        bt.user_id,
        jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) AS tags_json
      FROM public.bookmark_tags bt
      JOIN public.tags t ON t.id = bt.tag_id
      GROUP BY bt.bookmark_id, bt.user_id
    ),
    bookmark_cats_agg AS (
      SELECT
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
          ORDER BY bc.created_at ASC
        ) AS categories_json
      FROM public.bookmark_categories bc
      JOIN public.categories c ON c.id = bc.category_id
      GROUP BY bc.bookmark_id, bc.user_id
    )
  SELECT
    b.id,
    b.user_id,
    b.inserted_at,
    b.title,
    b.url,
    b.description,
    b."ogImage",
    b.trash,
    b.type,
    b.meta_data,
    b.sort_index,
    COALESCE(bta.tags_json, '[]'::jsonb) AS added_tags,
    COALESCE(bca.categories_json, '[]'::jsonb) AS added_categories,
    b.make_discoverable
  FROM public.everything b
  LEFT JOIN bookmark_tags_agg bta ON bta.bookmark_id = b.id AND bta.user_id = b.user_id
  LEFT JOIN bookmark_cats_agg bca ON bca.bookmark_id = b.id AND bca.user_id = b.user_id
  WHERE
    (
      url_scope IS NULL
      OR url_scope = ''
      OR b.url ILIKE '%' || url_scope || '%'
    )
    AND
    (
      tag_scope IS NULL
      OR array_length(tag_scope, 1) IS NULL
      OR (
        SELECT COUNT(DISTINCT LOWER(t.name))
        FROM public.bookmark_tags bt
        JOIN public.tags t ON t.id = bt.tag_id
        WHERE bt.bookmark_id = b.id
          AND LOWER(t.name) = ANY(SELECT LOWER(unnest(tag_scope)))
      ) = (
        SELECT COUNT(DISTINCT LOWER(tag))
        FROM unnest(tag_scope) AS tag
      )
    )
    AND
    (
      category_scope IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.bookmark_categories bc
        WHERE bc.bookmark_id = b.id
          AND bc.category_id = category_scope
      )
    )
    AND
    (
      search_text IS NULL
      OR btrim(search_text) = ''
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(string_to_array(LOWER(btrim(search_text)), ' ')) AS token
        WHERE token <> ''
          AND NOT (
            token % ANY(
              string_to_array(
                LOWER(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, '')),
                ' '
              )
            )
            OR LOWER(COALESCE(b.url, '')) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            OR EXISTS (
              SELECT 1
              FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
              WHERE key IN ('img_caption', 'image_caption', 'ocr')
                AND LOWER(value) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            )
            OR EXISTS (
              SELECT 1
              FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw
              WHERE LOWER(kw.keyword) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            )
          )
      )
    )
    AND
    (
      jsonb_array_length(color_hints) = 0
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        WHERE
          EXISTS (
            SELECT 1
            FROM public.bookmark_tags bt
            JOIN public.tags t ON t.id = bt.tag_id
            WHERE bt.bookmark_id = b.id
              AND LOWER(t.name) = LOWER(hint->>'tag_name')
          )
          OR public.color_matches_oklab(
            b.meta_data->'image_keywords'->'colors',
            (hint->>'l')::float,
            (hint->>'a')::float,
            (hint->>'b')::float
          )
      )
    )
    -- Type hints: match bookmark if it has a tag with that name OR image_keywords.type contains it
    AND
    (
      type_hints IS NULL
      OR array_length(type_hints, 1) IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint
        WHERE
          EXISTS (
            SELECT 1
            FROM public.bookmark_tags bt
            JOIN public.tags t ON t.id = bt.tag_id
            WHERE bt.bookmark_id = b.id
              AND LOWER(t.name) = LOWER(hint)
          )
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
              COALESCE(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
            ) AS t_val
            WHERE LOWER(t_val) = LOWER(hint)
          )
      )
    )

  ORDER BY
    -- Tier 1: Color hint tag matches first
    CASE
      WHEN jsonb_array_length(color_hints) = 0 THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        JOIN public.bookmark_tags bt ON bt.bookmark_id = b.id
        JOIN public.tags t ON t.id = bt.tag_id
        WHERE LOWER(t.name) = LOWER(hint->>'tag_name')
      ) THEN 1
      ELSE 0
    END DESC,
    -- Tier 2: Type hint precedence — tag match (2) > type-only match (1) > no match (0)
    CASE
      WHEN type_hints IS NULL OR array_length(type_hints, 1) IS NULL THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint
        JOIN public.bookmark_tags bt ON bt.bookmark_id = b.id
        JOIN public.tags t ON t.id = bt.tag_id
        WHERE LOWER(t.name) = LOWER(hint)
      ) THEN 2
      WHEN EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint,
        jsonb_array_elements_text(
          COALESCE(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
        ) AS t_val
        WHERE LOWER(t_val) = LOWER(hint)
      ) THEN 1
      ELSE 0
    END DESC,
    -- Tier 3: Similarity + color distance scoring
    (
      CASE
        WHEN search_text IS NULL OR btrim(search_text) = '' THEN 0
        ELSE (
          similarity(COALESCE(b.url, ''), btrim(search_text)) * 0.6 +
          similarity(COALESCE(b.title::text, ''), btrim(search_text)) * 0.5 +
          similarity(COALESCE(b.description, ''), btrim(search_text)) * 0.3 +
          similarity(COALESCE(b.meta_data->>'ocr', ''), btrim(search_text)) * 0.1 +
          similarity(COALESCE(b.meta_data->>'img_caption', ''), btrim(search_text)) * 0.15 +
          similarity(COALESCE(b.meta_data->>'image_caption', ''), btrim(search_text)) * 0.15 +
          similarity(
            COALESCE(
              (SELECT string_agg(kw.keyword, ' ') FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw),
              ''
            ),
            btrim(search_text)
          ) * 0.1
        )
      END
      +
      CASE
        WHEN jsonb_array_length(color_hints) = 0 THEN 0
        ELSE COALESCE(
          (
            SELECT max(
              CASE WHEN sqrt(power((hint->>'a')::float, 2) + power((hint->>'b')::float, 2)) < 0.04 THEN
                CASE WHEN sqrt(power((c.val->>'a')::float, 2) + power((c.val->>'b')::float, 2)) < 0.04
                  AND abs((hint->>'l')::float - (c.val->>'l')::float) < 0.15
                THEN (1.0 - abs((hint->>'l')::float - (c.val->>'l')::float)) * (1.0 / c.pos)
                ELSE 0 END
              ELSE
                CASE WHEN sqrt(
                  power((hint->>'l')::float - (c.val->>'l')::float, 2) +
                  power((hint->>'a')::float - (c.val->>'a')::float, 2) +
                  power((hint->>'b')::float - (c.val->>'b')::float, 2)
                ) < CASE
                  WHEN c.pos = 1 THEN 0.30
                  WHEN c.pos = 2 THEN 0.25
                  ELSE 0.18
                END
                THEN greatest(0, 1.0 - sqrt(
                  power((hint->>'l')::float - (c.val->>'l')::float, 2) +
                  power((hint->>'a')::float - (c.val->>'a')::float, 2) +
                  power((hint->>'b')::float - (c.val->>'b')::float, 2)
                )) * (1.0 / c.pos)
                ELSE 0 END
              END
            )
            FROM jsonb_array_elements(color_hints) AS hint
            CROSS JOIN jsonb_array_elements(COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)) WITH ORDINALITY AS c(val, pos)
          ),
          0
        )
      END
    ) DESC,
    b.inserted_at DESC;
END;
$function$;

-- PART 4: Re-grant execute (DROP FUNCTION wiped grants)
REVOKE EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO anon;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) IS
  'Bookmark search with URL/tag/category/color/type filters. Type hints match bookmarks that have a user-created tag with that name (sorted first) OR whose AI-extracted image_keywords.type contains the value. Tag-matched rows always sort above type-only matches.';

-- PART 5: Verification
DO $$
DECLARE
  v_column_exists int;
  v_function_exists int;
BEGIN
  SELECT COUNT(*) INTO v_column_exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'everything'
    AND column_name = 'screenshot';

  IF v_column_exists <> 0 THEN
    RAISE EXCEPTION 'everything.screenshot column still present';
  END IF;

  SELECT COUNT(*) INTO v_function_exists
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope'
    AND pg_get_function_identity_arguments(p.oid) =
      'search_text character varying, url_scope character varying, tag_scope text[], category_scope bigint, color_hints jsonb, type_hints text[]';

  IF v_function_exists = 0 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope missing after recreate';
  END IF;

  RAISE NOTICE 'Verification passed: screenshot column dropped, search RPC rebuilt';
END $$;

COMMIT;
