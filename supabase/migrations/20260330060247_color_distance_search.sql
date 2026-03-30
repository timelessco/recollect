-- ============================================================================
-- Migration: Add color distance search to bookmark search
-- ============================================================================
-- Purpose:
--   1. Create hex_channel() helper to extract RGB channels from hex strings
--   2. Create color_distance() helper for Euclidean RGB distance
--   3. Update search_bookmarks_url_tag_scope with color_hex parameter
--      and color distance ranking signal
-- ============================================================================

BEGIN;

-- Step 0: Drop old overloads so PostgREST resolves the 5-param version unambiguously
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[]);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);

-- Step 1: Helper to extract a single RGB channel (0-255) from a hex color string
-- pos=1 for red, pos=3 for green, pos=5 for blue
CREATE OR REPLACE FUNCTION public.hex_channel(hex text, pos int)
RETURNS int
LANGUAGE sql
IMMUTABLE STRICT
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ('x' || substring(replace(hex, '#', '') FROM pos FOR 2))::bit(8)::int;
$$;

COMMENT ON FUNCTION public.hex_channel(text, int) IS
'Extract a single RGB channel (0-255) from a hex color string. pos=1 red, pos=3 green, pos=5 blue.';

-- Step 2: Euclidean RGB distance between two hex colors (0-441 scale)
CREATE OR REPLACE FUNCTION public.color_distance(hex1 text, hex2 text)
RETURNS float
LANGUAGE sql
IMMUTABLE STRICT
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT sqrt(
    power((public.hex_channel(hex1, 1) - public.hex_channel(hex2, 1))::float, 2) +
    power((public.hex_channel(hex1, 3) - public.hex_channel(hex2, 3))::float, 2) +
    power((public.hex_channel(hex1, 5) - public.hex_channel(hex2, 5))::float, 2)
  );
$$;

COMMENT ON FUNCTION public.color_distance(text, text) IS
'Euclidean RGB distance between two hex colors. Range 0 (identical) to ~441 (black vs white).';

-- Step 3: Update search function with color_hex parameter
CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL,
    color_hex character varying DEFAULT NULL
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
            -- Color filter: only keep bookmarks with a matching stored color
            color_hex IS NULL
            OR color_hex = ''
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(b.meta_data->'image_keywords'->'color') AS c(hex)
                WHERE public.color_distance(color_hex, c.hex) < 200
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
        -- Color distance ranking (independent of text search)
        CASE
            WHEN color_hex IS NOT NULL AND color_hex <> '' THEN
                COALESCE(
                    (SELECT (1.0 - MIN(public.color_distance(color_hex, c.hex)) / 441.0) * 0.12
                     FROM jsonb_array_elements_text(b.meta_data->'image_keywords'->'color') AS c(hex)
                     WHERE public.color_distance(color_hex, c.hex) < 200),
                    0
                )
            ELSE 0
        END
        DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, character varying) IS
'Bookmark search with URL/tag/category/color filters. Multi-word AND semantics. Color distance uses Euclidean RGB with threshold 80 (~18% of max). color_hex parameter is optional; when provided, bookmarks with visually similar stored colors get a ranking boost.';

COMMIT;
