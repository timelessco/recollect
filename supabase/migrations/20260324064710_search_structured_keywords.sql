-- ============================================================================
-- Migration: Support structured keywords in bookmark search
-- ============================================================================
-- Purpose:
--   Update search_bookmarks_url_tag_scope to handle image_keywords as either:
--   - Old format: JSON array of strings  ["keyword1", "keyword2"]
--   - New format: JSON object with typed keys  {"type": "movie", "person": "Tom Hanks"}
--   Uses jsonb_typeof() to branch between array and object extraction.
-- Affected: public.search_bookmarks_url_tag_scope
-- No table or index changes.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL
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
                    -- Match token in image_keywords (supports both array and object formats)
                    OR EXISTS (
                        SELECT 1
                        FROM LATERAL (
                            SELECT jsonb_array_elements_text(b.meta_data->'image_keywords') AS kw
                            WHERE jsonb_typeof(b.meta_data->'image_keywords') = 'array'
                            UNION ALL
                            SELECT value AS kw
                            FROM jsonb_each_text(b.meta_data->'image_keywords')
                            WHERE jsonb_typeof(b.meta_data->'image_keywords') = 'object'
                        ) AS keywords
                        WHERE lower(keywords.kw) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                  )
            )
        )

    ORDER BY
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
                        CASE jsonb_typeof(COALESCE(b.meta_data->'image_keywords', '[]'::jsonb))
                            WHEN 'array' THEN
                                (SELECT string_agg(kw, ' ') FROM jsonb_array_elements_text(b.meta_data->'image_keywords') AS kw)
                            WHEN 'object' THEN
                                (SELECT string_agg(val, ' ') FROM jsonb_each_text(b.meta_data->'image_keywords') AS x(k, val))
                            ELSE ''
                        END,
                        ''
                    ),
                    btrim(search_text)
                ) * 0.1
            )
        END DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Bookmark search with URL/tag/category filters. Multi-word AND semantics: each token must match in title/description, url, or meta (img_caption, image_caption, ocr, image_keywords). Supports image_keywords as both JSON array (legacy) and JSON object (structured). VOLATILE so pg_trgm.similarity_threshold applies correctly.';

COMMIT;
