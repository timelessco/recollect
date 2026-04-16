-- ============================================================================
-- Migration: Tighten fuzzy color quality floor (0.22 → 0.50)
-- ============================================================================
-- Purpose:
--   Local iteration following the team call on 2026-04-16. The dropped-fuzzy
--   experiment produced zero results for users with small libraries and rare
--   palette colors (e.g. Roger's 47-bookmark library returned 0 for `#blue`
--   because his closest blue-dominant distance was 0.110 — just outside the
--   exact Tier A 0.10 window, and his accent colors were all 0.097+ from pure
--   blue). Fuzzy has to stay for recall; the complaint was noise, not
--   presence.
--
--   Tighten the quality floor in `search_bookmarks_url_tag_scope` from 0.22
--   to 0.50. This is the single constant that gates whether a stored palette
--   colour qualifies a bookmark via the fuzzy OKLCh ranker, applied after
--   positional decay. An intermediate 0.35 was tried first — it cut ~25% of
--   rows but didn't visibly change the top positions because Tier E's
--   score-based ORDER BY already pushed the dropped rows to the tail. 0.50
--   roughly halves qualifying rows across common hues (red 333→151, blue
--   221→86, yellow 112→46) which reshapes the top of the result set.
--
--     Position 1 must score >= 0.50  (only strong dominant matches survive)
--     Position 2 must score >= 0.75  (very strong accents only)
--     Position 3+                    (effectively can't qualify)
--
--   Tiers A (dominant within 0.05) and B (non-dominant within 0.02) stay as
--   exact-match priority tiers at the top of the ORDER BY — this migration
--   only touches the fuzzy floor.
--
-- Rollback:
--   Restore `20260416120000_exact_color_match_tiers.sql` (uses 0.22).
-- ============================================================================

BEGIN;

-- PART 1: Drop the 6-parameter overload before recreating.

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb, text[]
);

-- PART 2: Recreate. Identical to 20260416120000 except the fuzzy quality
-- floor constant: `>= 0.22` → `>= 0.50` in the WHERE clause. ORDER BY
-- unchanged (Tier A 0.05 / Tier B 0.02 exact match, then tag, type, combined
-- text+fuzzy score, then recency).

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
          -- Fuzzy quality floor tightened from 0.22 to 0.50: the positional-
          -- decayed score `lch_color_score × exp(-0.4 × (pos - 1))` must clear
          -- 0.50 for a stored palette color to qualify the bookmark.
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
            ) WITH ORDINALITY AS c(val, pos)
            WHERE public.lch_color_score(
              (hint->>'l')::float, (hint->>'a')::float, (hint->>'b')::float,
              (c.val->>'l')::float, (c.val->>'a')::float, (c.val->>'b')::float
            ) * exp(-0.4 * (c.pos - 1)) >= 0.50
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
    -- Tier A: dominant palette color (index 0) within OKLab 0.05 of any hint.
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

    -- Tier B: non-dominant palette color (index > 0) within OKLab 0.02 of any hint.
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

    -- Tier C: color hint tag matches.
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

    -- Tier D: type hint precedence — tag match (2) > type-only match (1) > none (0).
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

    -- Tier E: text similarity + MAX fuzzy color score across hint × palette pairs.
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

    -- Tier F: recency tiebreaker.
    b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) IS
  'Bookmark search with URL/tag/category/color/type filters. Accepts up to 3 color hints as {tag_name,l,a,b} (cap enforced by the route handler). A row qualifies for a hint when it has a tag with that name OR some palette color (any position, with positional decay) scores >= 0.50 under lch_color_score × exp(-0.4 * (pos - 1)) — floor tightened from 0.22 on 2026-04-16 to cut low-quality fuzzy matches. ORDER BY tiers, highest first: (A) dominant palette color within OKLab 0.05 of any hint, (B) non-dominant palette color within OKLab 0.02, (C) color-tag match, (D) type-hint tier (tag > type-only > none), (E) text similarity + MAX(lch_color_score × decay) across hint × palette pairs, (F) inserted_at DESC.';

-- PART 3: Restore access controls.

REVOKE EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO anon;

-- PART 4: Verification — single overload, new floor value present, Tiers A/B preserved.

DO $$
DECLARE
  v_overload_count int;
  v_body text;
BEGIN
  SELECT COUNT(*) INTO v_overload_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope';

  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope';

  IF v_overload_count <> 1 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope has % overloads, expected 1', v_overload_count;
  END IF;
  IF v_body NOT LIKE '%>= 0.50%' THEN
    RAISE EXCEPTION 'Fuzzy quality floor (0.50) missing';
  END IF;
  IF v_body LIKE '%>= 0.22%' THEN
    RAISE EXCEPTION 'Old fuzzy floor (0.22) still present — tighten did not apply cleanly';
  END IF;
  IF v_body NOT LIKE '%<= 0.05%' THEN
    RAISE EXCEPTION 'Tier A (0.05) missing';
  END IF;
  IF v_body NOT LIKE '%<= 0.02%' THEN
    RAISE EXCEPTION 'Tier B (0.02) missing';
  END IF;
  IF v_body NOT LIKE '%lch_color_score%' THEN
    RAISE EXCEPTION 'Fuzzy ranker missing — expected lch_color_score to be present';
  END IF;

  RAISE NOTICE 'Verification passed: fuzzy floor tightened to 0.50, Tiers A + B preserved';
END $$;

COMMIT;
