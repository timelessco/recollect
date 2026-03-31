-- ============================================================================
-- Migration: Add color distance search to bookmark search
-- ============================================================================
-- Purpose:
--   1. Remove legacy color string arrays (will be re-populated with OKLAB on next enrichment)
--   2. Drop old function overloads for unambiguous PostgREST resolution
--   3. Update search_bookmarks_url_tag_scope with OKLAB color search params
--      (color_l, color_a, color_b) that compare against pre-computed OKLAB
--      values stored in meta_data.image_keywords.color
-- ============================================================================

BEGIN;

-- Step 0: Remove legacy color string arrays
-- These had hex values without OKLAB data. New enrichment will re-populate
-- with proper OKLAB colors on next AI processing.
UPDATE public.everything
SET meta_data = meta_data #- '{image_keywords,color}'
WHERE meta_data->'image_keywords'->'color' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords'->'color') = 'array';

-- Step 0: Drop old overloads so PostgREST resolves the new version unambiguously
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[]);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, character varying);

-- Step 1: Drop old helper functions (no longer needed — OKLAB is pre-computed)
DROP FUNCTION IF EXISTS public.oklab_distance(text, text);
DROP FUNCTION IF EXISTS public.color_distance(text, text);
DROP FUNCTION IF EXISTS public.hex_channel(text, int);

-- Step 2: Update search function with OKLAB color params
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
            -- Stored format: { primary_color: {l,a,b} | null, secondary_colors: [{l,a,b},...] }
            -- Achromatic search (chroma < 0.04): match by low stored chroma
            -- Chromatic search: match by full OKLAB Euclidean distance
            color_l IS NULL
            OR (
                CASE WHEN SQRT(POWER(color_a, 2) + POWER(color_b, 2)) < 0.04 THEN
                    -- Achromatic: match any stored color with low chroma (grays/blacks/whites)
                    (
                        b.meta_data->'image_keywords'->'color'->'primary_color'->>'a' IS NOT NULL
                        AND SQRT(
                            POWER(((b.meta_data->'image_keywords'->'color'->'primary_color'->>'a')::float), 2) +
                            POWER(((b.meta_data->'image_keywords'->'color'->'primary_color'->>'b')::float), 2)
                        ) < 0.04
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(b.meta_data->'image_keywords'->'color'->'secondary_colors') AS sc
                        WHERE SQRT(POWER((sc->>'a')::float, 2) + POWER((sc->>'b')::float, 2)) < 0.04
                    )
                ELSE
                    -- Chromatic: full OKLAB distance
                    SQRT(
                        POWER(color_l - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'l')::float), 2) +
                        POWER(color_a - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'a')::float), 2) +
                        POWER(color_b - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'b')::float), 2)
                    ) < 0.25
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(b.meta_data->'image_keywords'->'color'->'secondary_colors') AS sc
                        WHERE SQRT(
                            POWER(color_l - (sc->>'l')::float, 2) +
                            POWER(color_a - (sc->>'a')::float, 2) +
                            POWER(color_b - (sc->>'b')::float, 2)
                        ) < 0.25
                    )
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
        -- Color ranking: achromatic ranks by lightness closeness, chromatic by OKLAB distance
        CASE
            WHEN color_l IS NULL THEN 0
            WHEN SQRT(POWER(color_a, 2) + POWER(color_b, 2)) < 0.04 THEN
                -- Achromatic: rank by lightness distance (closer lightness = higher score)
                GREATEST(
                    CASE WHEN b.meta_data->'image_keywords'->'color'->'primary_color'->>'a' IS NOT NULL
                        AND SQRT(
                            POWER(((b.meta_data->'image_keywords'->'color'->'primary_color'->>'a')::float), 2) +
                            POWER(((b.meta_data->'image_keywords'->'color'->'primary_color'->>'b')::float), 2)
                        ) < 0.04
                    THEN GREATEST(0, (1.0 - ABS(color_l - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'l')::float))) * 0.15)
                    ELSE 0 END,
                    COALESCE(
                        (SELECT MAX(GREATEST(0, (1.0 - ABS(color_l - (sc->>'l')::float)) * 0.10))
                        FROM jsonb_array_elements(b.meta_data->'image_keywords'->'color'->'secondary_colors') AS sc
                        WHERE SQRT(POWER((sc->>'a')::float, 2) + POWER((sc->>'b')::float, 2)) < 0.04),
                        0
                    )
                )
            ELSE
                -- Chromatic: rank by full OKLAB distance
                GREATEST(
                    CASE WHEN b.meta_data->'image_keywords'->'color'->'primary_color'->>'l' IS NOT NULL THEN
                        GREATEST(0, (1.0 - SQRT(
                            POWER(color_l - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'l')::float), 2) +
                            POWER(color_a - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'a')::float), 2) +
                            POWER(color_b - ((b.meta_data->'image_keywords'->'color'->'primary_color'->>'b')::float), 2)
                        )) * 0.15)
                    ELSE 0 END,
                    COALESCE(
                        (SELECT MAX(GREATEST(0, (1.0 - SQRT(
                            POWER(color_l - (sc->>'l')::float, 2) +
                            POWER(color_a - (sc->>'a')::float, 2) +
                            POWER(color_b - (sc->>'b')::float, 2)
                        )) * 0.10))
                        FROM jsonb_array_elements(b.meta_data->'image_keywords'->'color'->'secondary_colors') AS sc),
                        0
                    )
                )
        END
        DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, double precision, double precision, double precision) IS
'Bookmark search with URL/tag/category/color filters. Color uses pre-computed OKLAB values with perceptual distance threshold 0.25. Primary color gets higher ranking weight (0.15) than secondary (0.10).';

COMMIT;
