-- ============================================================================
-- Migration: Full-text search multi-word AND semantics and VOLATILE
-- ============================================================================
-- Purpose:
--   1. Replace search logic with multi-word AND semantics: split search_text
--      by spaces; each token must match in title/description, url, or meta
--      (img_caption, image_caption, ocr).
--   2. Add image_caption to meta_data key checks and to ORDER BY similarity.
--   3. Set function to VOLATILE so SET LOCAL pg_trgm.similarity_threshold
--      is respected (STABLE allows planner to cache/fold in ways that break it).
-- Affected: public.search_bookmarks_url_tag_scope
-- No table or index changes.
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);

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
    -- Pre-aggregate tags (single pass, avoids N+1)
    bookmark_tags_agg AS (
        SELECT
            bt.bookmark_id,
            bt.user_id,
            jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) AS tags_json
        FROM public.bookmark_tags bt
        JOIN public.tags t ON t.id = bt.tag_id
        GROUP BY bt.bookmark_id, bt.user_id
    ),
    -- Pre-aggregate categories (single pass, avoids N+1)
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
        -- URL scope filter (optional)
        (
            url_scope IS NULL
            OR url_scope = ''
            OR b.url ILIKE '%' || url_scope || '%'
        )

        AND
        -- Tag scope filter (optional, supports multiple tags with AND logic)
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
            ) = array_length(tag_scope, 1)  -- Must match ALL searched tags (AND logic)
        )

        AND
        -- Category scope filter via junction table (optional)
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
        -- Main search_text logic (multi-word AND semantics)
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
                    -- token must match somewhere in title/description, url, or img_caption/image_caption/ocr
                    token % ANY(
                        string_to_array(
                            lower(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, '')),
                            ' '
                        )
                    )
                    OR lower(COALESCE(b.url, '')) LIKE '%' || token || '%'
                    OR EXISTS (
                        SELECT 1
                        FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                        WHERE key IN ('img_caption', 'image_caption', 'ocr')
                          AND lower(value) LIKE '%' || token || '%'
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
                similarity(COALESCE(b.meta_data->>'image_caption', ''), btrim(search_text)) * 0.15
            )
        END DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Bookmark search with URL/tag/category filters. Multi-word AND semantics: each token must match in title/description, url, or meta (img_caption, image_caption, ocr). VOLATILE so pg_trgm.similarity_threshold applies correctly.';
