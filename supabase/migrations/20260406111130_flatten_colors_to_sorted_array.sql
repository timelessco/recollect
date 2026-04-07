-- ============================================================================
-- Migration: Flatten color storage from {primary_color, secondary_colors}
--            to a single sorted OKLAB array, rename key to "colors"
-- ============================================================================
-- Purpose:
--   1. Convert existing color objects to flat arrays: [primary, ...secondary]
--   2. Rename key from "color" to "colors"
--   3. Update search_bookmarks_url_tag_scope to use positional weighting
--      where earlier array elements (more dominant colors) get higher precedence
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Data migration — flatten existing color objects to arrays
-- ============================================================================
-- Converts { primary_color: {l,a,b}, secondary_colors: [{l,a,b},...] }
-- to [{l,a,b}, {l,a,b}, ...] where index 0 = most dominant color

-- Case 1: Has primary_color + secondary_colors
UPDATE public.everything
SET meta_data = jsonb_set(
  meta_data,
  '{image_keywords,color}',
  (
    jsonb_build_array(meta_data->'image_keywords'->'color'->'primary_color')
    || COALESCE(meta_data->'image_keywords'->'color'->'secondary_colors', '[]'::jsonb)
  )
)
WHERE meta_data->'image_keywords'->'color'->'primary_color' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords'->'color') = 'object';

-- Case 2: Has secondary_colors only (primary_color is null)
UPDATE public.everything
SET meta_data = jsonb_set(
  meta_data,
  '{image_keywords,color}',
  COALESCE(meta_data->'image_keywords'->'color'->'secondary_colors', '[]'::jsonb)
)
WHERE meta_data->'image_keywords'->'color' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords'->'color') = 'object'
  AND (
    meta_data->'image_keywords'->'color'->'primary_color' IS NULL
    OR meta_data->'image_keywords'->'color'->>'primary_color' = 'null'
  );

-- ============================================================================
-- PART 2: Rename key from "color" to "colors"
-- ============================================================================

UPDATE public.everything
SET meta_data = jsonb_set(
  meta_data #- '{image_keywords,color}',
  '{image_keywords,colors}',
  meta_data->'image_keywords'->'color'
)
WHERE meta_data->'image_keywords'->'color' IS NOT NULL;

-- ============================================================================
-- PART 3: Drop old function overloads
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, double precision, double precision, double precision);

-- ============================================================================
-- PART 4: Recreate search function with positional array weighting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL,
    color_l double precision DEFAULT NULL,
    color_a double precision DEFAULT NULL,
    color_b double precision DEFAULT NULL
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
                  AND LOWER(t.name) = ANY(
                      SELECT LOWER(unnest(tag_scope))
                  )
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
                FROM unnest(
                    string_to_array(
                        lower(btrim(search_text)),
                        ' '
                    )
                ) AS token
                WHERE token <> ''
                  AND NOT (
                    token % ANY(
                        string_to_array(
                            lower(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, '')),
                            ' '
                        )
                    )
                    OR lower(COALESCE(b.url, '')) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                        WHERE key IN ('img_caption', 'image_caption', 'ocr')
                          AND lower(value) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                    -- Match token in image_keywords (nested format only)
                    OR EXISTS (
                        SELECT 1
                        FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw
                        WHERE lower(kw.keyword) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                  )
            )
        )
        AND
        (
            -- Color filter: OKLAB perceptual distance on pre-computed values
            -- Stored format: image_keywords.colors = [{l,a,b}, ...] sorted by dominance
            -- Achromatic search (chroma < 0.04): match any stored color with low chroma
            -- Chromatic search: OKLAB Euclidean distance with positional threshold
            color_l IS NULL
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                    COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
                ) WITH ORDINALITY AS c(val, pos)
                WHERE
                    CASE WHEN SQRT(POWER(color_a, 2) + POWER(color_b, 2)) < 0.04 THEN
                        -- Achromatic: match stored colors with low chroma AND close lightness
                        -- (without the L check, "white" would match "black" since both are achromatic)
                        SQRT(POWER((c.val->>'a')::float, 2) + POWER((c.val->>'b')::float, 2)) < 0.04
                        AND ABS(color_l - (c.val->>'l')::float) < 0.15
                    ELSE
                        -- Chromatic: OKLAB distance with positional threshold
                        -- Index 1 (most dominant) = 0.30, index 2 = 0.25, index 3+ = 0.18
                        SQRT(
                            POWER(color_l - (c.val->>'l')::float, 2) +
                            POWER(color_a - (c.val->>'a')::float, 2) +
                            POWER(color_b - (c.val->>'b')::float, 2)
                        ) < CASE
                            WHEN c.pos = 1 THEN 0.30
                            WHEN c.pos = 2 THEN 0.25
                            ELSE 0.18
                        END
                    END
            )
        )

    ORDER BY
        -- Text similarity (only when search_text is non-empty)
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
        END +
        -- Color ranking: positional weighting — earlier array positions score higher
        -- Weight = 1.0 / position, so index 1 = 1.0, index 2 = 0.5, index 3 = 0.33, etc.
        CASE
            WHEN color_l IS NULL THEN 0
            ELSE COALESCE(
                (SELECT MAX(
                    CASE WHEN SQRT(POWER(color_a, 2) + POWER(color_b, 2)) < 0.04 THEN
                        -- Achromatic: low chroma + close lightness, weighted by position
                        -- (L gate keeps this consistent with the WHERE-clause achromatic filter)
                        CASE WHEN SQRT(POWER((c.val->>'a')::float, 2) + POWER((c.val->>'b')::float, 2)) < 0.04
                          AND ABS(color_l - (c.val->>'l')::float) < 0.15
                        THEN (1.0 - ABS(color_l - (c.val->>'l')::float)) * (1.0 / c.pos)
                        ELSE 0 END
                    ELSE
                        -- Chromatic: OKLAB distance closeness, weighted by position
                        GREATEST(0, 1.0 - SQRT(
                            POWER(color_l - (c.val->>'l')::float, 2) +
                            POWER(color_a - (c.val->>'a')::float, 2) +
                            POWER(color_b - (c.val->>'b')::float, 2)
                        )) * (1.0 / c.pos)
                    END
                )
                FROM jsonb_array_elements(
                    COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
                ) WITH ORDINALITY AS c(val, pos)),
                0
            )
        END
        DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, double precision, double precision, double precision) IS
'Bookmark search with URL/tag/category/color filters. Colors stored as OKLAB array (image_keywords.colors) sorted by dominance. Achromatic searches (chroma < 0.04) match low-chroma colors by lightness. Chromatic searches use OKLAB Euclidean distance with positional thresholds (index 1: 0.30, index 2: 0.25, index 3+: 0.18). Results ranked by positional weight (1/index) so dominant colors score higher.';

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

DO $$
DECLARE
  v_migrated_count int;
  v_remaining_old int;
  v_non_array_count int;
BEGIN
  -- Count rows with new "colors" array key (migrated successfully)
  SELECT count(*) INTO v_migrated_count
  FROM public.everything
  WHERE meta_data->'image_keywords'->'colors' IS NOT NULL
    AND jsonb_typeof(meta_data->'image_keywords'->'colors') = 'array';

  -- Count rows still with old "color" key (should be 0)
  SELECT count(*) INTO v_remaining_old
  FROM public.everything
  WHERE meta_data->'image_keywords'->'color' IS NOT NULL;

  -- Count rows where new "colors" key exists but is malformed (not an array)
  SELECT count(*) INTO v_non_array_count
  FROM public.everything
  WHERE meta_data->'image_keywords'->'colors' IS NOT NULL
    AND jsonb_typeof(meta_data->'image_keywords'->'colors') <> 'array';

  RAISE NOTICE 'Color migration: % rows migrated to "colors" array, % rows still have old "color" key, % rows have malformed (non-array) colors',
    v_migrated_count, v_remaining_old, v_non_array_count;

  -- Fail the migration (rolls back the transaction) if any leftover or malformed rows remain
  IF v_remaining_old > 0 OR v_non_array_count > 0 THEN
    RAISE EXCEPTION 'Color migration verification failed: % rows migrated, % rows still have old "color" key, % rows have malformed (non-array) colors — rolling back',
      v_migrated_count, v_remaining_old, v_non_array_count;
  END IF;
END $$;

COMMIT;
