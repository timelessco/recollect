-- ============================================================================
-- Migration: Exact-match ranking tiers for color search
-- ============================================================================
-- Purpose:
--   Prepend two priority tiers to `search_bookmarks_url_tag_scope` ORDER BY so
--   bookmarks whose palette contains a near-exact hit for any color hint rank
--   above rows that only match via the fuzzy OKLCh ranker from
--   20260415120000_lch_color_search_ranking.sql.
--
--   Tier A: dominant palette color (index 0) within OKLab Euclidean distance
--           0.05 of any hint — a visibly-same "hero" color.
--   Tier B: some non-dominant palette color (index > 0) within OKLab distance
--           0.02 of any hint — tighter threshold since position no longer
--           contributes signal.
--
--   Tiers A and B are booleans that sort DESC (1 above 0). Rows that clear
--   neither fall through to the existing tiers (color-tag match, type-hint
--   tier, text similarity + fuzzy color score, inserted_at). The 0.05/0.02
--   thresholds sit on the same OKLab scale as existing constants (0.04
--   achromatic cap, 0.10 hi-chroma cutoff in `lch_color_score`).
--
-- Changes:
--   1. Drop the existing 6-parameter `search_bookmarks_url_tag_scope` overload.
--   2. Recreate it with an unchanged signature, WHERE clause, and existing
--      ORDER BY tiers, plus the two new boolean priority tiers at the top.
-- ============================================================================

BEGIN;

-- PART 1: Drop the existing 6-parameter overload before recreating it. The
-- CREATE OR REPLACE below cannot alter return type metadata safely if the
-- function is redefined in-place across PostgREST schema reloads.

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb, text[]
);

-- PART 2: Recreate the function with the same signature and filter logic,
-- plus two new priority tiers prepended to the ORDER BY.

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
          -- Quality floor (0.22) enforced via the positional-decayed score:
          -- at least one stored color must score >= 0.22 after decay.
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
            ) WITH ORDINALITY AS c(val, pos)
            WHERE public.lch_color_score(
              (hint->>'l')::float, (hint->>'a')::float, (hint->>'b')::float,
              (c.val->>'l')::float, (c.val->>'a')::float, (c.val->>'b')::float
            ) * exp(-0.4 * (c.pos - 1)) >= 0.22
          )
      )
    )
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
    -- Tier A (NEW): dominant palette color (index 0) within OKLab Euclidean
    -- distance 0.05 of any hint. Pins bookmarks whose hero color visibly
    -- matches the query above everything else.
    CASE
      WHEN jsonb_array_length(color_hints) = 0 THEN 0
      WHEN (b.meta_data->'image_keywords'->'colors'->0->>'l') IS NULL THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        WHERE sqrt(
          power((hint->>'l')::float - (b.meta_data->'image_keywords'->'colors'->0->>'l')::float, 2) +
          power((hint->>'a')::float - (b.meta_data->'image_keywords'->'colors'->0->>'a')::float, 2) +
          power((hint->>'b')::float - (b.meta_data->'image_keywords'->'colors'->0->>'b')::float, 2)
        ) <= 0.05
      ) THEN 1
      ELSE 0
    END DESC,

    -- Tier B (NEW): some non-dominant palette color (index > 0) within OKLab
    -- Euclidean distance 0.02 of any hint. Tighter threshold than Tier A
    -- since dominance no longer contributes signal.
    CASE
      WHEN jsonb_array_length(color_hints) = 0 THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        CROSS JOIN jsonb_array_elements(
          COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
        ) WITH ORDINALITY AS c(val, pos)
        WHERE c.pos > 1
          AND sqrt(
            power((hint->>'l')::float - (c.val->>'l')::float, 2) +
            power((hint->>'a')::float - (c.val->>'a')::float, 2) +
            power((hint->>'b')::float - (c.val->>'b')::float, 2)
          ) <= 0.02
      ) THEN 1
      ELSE 0
    END DESC,

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
    -- Tier 3: Similarity + color closeness (max over hint x palette of
    -- lch_color_score x positional decay exp(-0.4 * (pos - 1))).
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
              public.lch_color_score(
                (hint->>'l')::float, (hint->>'a')::float, (hint->>'b')::float,
                (c.val->>'l')::float, (c.val->>'a')::float, (c.val->>'b')::float
              ) * exp(-0.4 * (c.pos - 1))
            )
            FROM jsonb_array_elements(color_hints) AS hint
            CROSS JOIN jsonb_array_elements(
              COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
            ) WITH ORDINALITY AS c(val, pos)
          ),
          0
        )
      END
    ) DESC,
    b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) IS
  'Bookmark search with URL/tag/category/color/type filters. Accepts up to 3 color hints as {tag_name,l,a,b} (cap enforced by the route handler; the function itself iterates every hint passed in). A row qualifies for a hint when it has a tag with that name OR some palette color (any position, not only the dominant) scores >= 0.22 under lch_color_score × exp(-0.4 * (pos - 1)) positional decay. ORDER BY tiers, highest first: (A) dominant palette color (index 0) within OKLab distance 0.05 of any hint, (B) non-dominant palette color (index > 0) within OKLab distance 0.02 of any hint, (C) color-tag match, (D) type-hint tier (tag match > type-only match > none), (E) text similarity (url/title/description/captions/image_keywords) + MAX(lch_color_score × positional decay) across all hint x palette pairs, (F) inserted_at DESC as final tiebreaker.';

-- PART 3: Restore access controls. `CREATE OR REPLACE` preserves existing
-- grants, but the `DROP FUNCTION` above removed them, so re-grant explicitly.

REVOKE EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO anon;

-- PART 4: Smoke verification — confirm exactly one 6-arg overload remains and
-- the function body contains the two new OKLab thresholds.

DO $$
DECLARE
  v_overload_count int;
  v_expected_present int;
  v_body text;
BEGIN
  SELECT COUNT(*) INTO v_overload_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope';

  SELECT COUNT(*) INTO v_expected_present
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope'
    AND pg_get_function_identity_arguments(p.oid) =
      'search_text character varying, url_scope character varying, tag_scope text[], category_scope bigint, color_hints jsonb, type_hints text[]';

  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope';

  IF v_overload_count <> 1 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope has % overloads, expected exactly 1', v_overload_count;
  END IF;
  IF v_expected_present = 0 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope with 6-arg signature not present';
  END IF;
  IF v_body NOT LIKE '%<= 0.05%' THEN
    RAISE EXCEPTION 'Tier A threshold (0.05) not present in function body';
  END IF;
  IF v_body NOT LIKE '%<= 0.02%' THEN
    RAISE EXCEPTION 'Tier B threshold (0.02) not present in function body';
  END IF;

  RAISE NOTICE 'Verification passed: single 6-arg overload with new exact-match tiers present';
END $$;

COMMIT;
