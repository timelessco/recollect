-- ============================================================================
-- Migration: Replace color_l/a/b parameters with color_hints jsonb
-- ============================================================================
-- Purpose:
--   1. Extract inline OKLAB distance match into a reusable helper
--      `color_matches_oklab(colors jsonb, l, a, b float) returns bool`.
--   2. Drop the previous `search_bookmarks_url_tag_scope` overload that took
--      three float color parameters.
--   3. Recreate with `color_hints jsonb` (an array of {tag_name, l, a, b}
--      objects, max 3).
--   4. Sort tag-matched bookmarks ABOVE color-only matches via a new
--      top-level ORDER BY expression.
-- ============================================================================

BEGIN;

-- PART 1: Extract OKLAB distance match into a reusable helper
-- Pure refactor of the WHERE-clause color block from
-- 20260406111130_flatten_colors_to_sorted_array.sql lines 220-252.

CREATE OR REPLACE FUNCTION public.color_matches_oklab(
  colors jsonb,
  hint_l double precision,
  hint_a double precision,
  hint_b double precision
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(colors, '[]'::jsonb)) WITH ORDINALITY AS c(val, pos)
    WHERE
      CASE WHEN sqrt(power(hint_a, 2) + power(hint_b, 2)) < 0.04 THEN
        sqrt(power((c.val->>'a')::float, 2) + power((c.val->>'b')::float, 2)) < 0.04
        AND abs(hint_l - (c.val->>'l')::float) < 0.15
      ELSE
        sqrt(
          power(hint_l - (c.val->>'l')::float, 2) +
          power(hint_a - (c.val->>'a')::float, 2) +
          power(hint_b - (c.val->>'b')::float, 2)
        ) < CASE
          WHEN c.pos = 1 THEN 0.30
          WHEN c.pos = 2 THEN 0.25
          ELSE 0.18
        END
      END
  );
$$;

COMMENT ON FUNCTION public.color_matches_oklab(jsonb, double precision, double precision, double precision) IS
  'Returns true if any color in the JSONB array (sorted by dominance, index 1 = most dominant) is within OKLAB perceptual distance of the given hint. Achromatic searches (chroma < 0.04) match low-chroma stored colors by lightness. Chromatic searches use positional distance thresholds.';

-- PART 2: Drop the old search function overload

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying,
  character varying,
  text[],
  bigint,
  double precision,
  double precision,
  double precision
);

-- PART 3: Recreate search function with color_hints jsonb parameter

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
  search_text character varying DEFAULT '',
  url_scope character varying DEFAULT '',
  tag_scope text[] DEFAULT NULL,
  category_scope bigint DEFAULT NULL,
  color_hints jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(
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
    b.screenshot,
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

  ORDER BY
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

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb) IS
  'Bookmark search with URL/tag/category filters and color hints. Color hints are an array of {tag_name,l,a,b} entries; a row matches a hint when it has a tag with that name OR its dominant image colors fall within OKLAB distance. Tag-matched rows always sort above color-only matches (strict precedence). Capped at 3 hints by the route handler.';

-- PART 4: Smoke verification — function exists with new signature
DO $$
DECLARE
  v_helper_exists int;
  v_search_exists int;
BEGIN
  SELECT COUNT(*) INTO v_helper_exists
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'color_matches_oklab';

  SELECT COUNT(*) INTO v_search_exists
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope'
    AND pg_get_function_identity_arguments(p.oid) =
      'search_text character varying, url_scope character varying, tag_scope text[], category_scope bigint, color_hints jsonb';

  IF v_helper_exists = 0 THEN
    RAISE EXCEPTION 'color_matches_oklab helper not created';
  END IF;
  IF v_search_exists = 0 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope with new signature not created';
  END IF;

  RAISE NOTICE 'Verification passed: helper + new search function present';
END $$;

COMMIT;
