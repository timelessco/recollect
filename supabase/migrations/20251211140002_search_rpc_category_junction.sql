-- ============================================================================
-- MIGRATION: Add category_scope to search_bookmarks_url_tag_scope RPC
-- Created: 2025-12-11
-- Purpose:
--   * Add category_scope parameter for filtering by junction table
--   * Filter via bookmark_categories junction table (many-to-many support)
--   * Add added_categories JSONB output (like added_tags pattern)
-- Notes:
--   * Replaces filtering by everything.category_id (deprecated column)
--   * Uses EXISTS subquery for efficient junction table filtering
--   * Index idx_bookmark_categories_category_id supports this query
-- ============================================================================

BEGIN;

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL  -- NEW: Filter by category via junction table
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
    category_id bigint,
    trash boolean,
    type text,
    meta_data jsonb,
    sort_index text,
    added_tags jsonb,
    added_categories jsonb  -- NEW: Categories for each bookmark
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
    SET LOCAL pg_trgm.similarity_threshold = 0.6;

    RETURN QUERY
    SELECT
        b.*,
        -- Aggregate tags from junction table
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', t.id,
                        'name', t.name
                    )
                )
                FROM public.bookmark_tags bt
                JOIN public.tags t ON t.id = bt.tag_id
                WHERE bt.bookmark_id = b.id
                  AND bt.user_id = b.user_id
            ),
            '[]'::jsonb
        ) AS added_tags,
        -- NEW: Aggregate categories from junction table
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'category_name', c.category_name,
                        'category_slug', c.category_slug,
                        'icon', c.icon,
                        'icon_color', c.icon_color
                    )
                )
                FROM public.bookmark_categories bc
                JOIN public.categories c ON c.id = bc.category_id
                WHERE bc.bookmark_id = b.id
                  AND bc.user_id = b.user_id
            ),
            '[]'::jsonb
        ) AS added_categories
    FROM public.everything b
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
        -- NEW: Category scope filter via junction table (optional)
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
        -- Main search_text logic (optional)
        (
            search_text IS NULL
            OR search_text = ''
            OR (
                search_text % ANY(STRING_TO_ARRAY(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, ''), ' '))
                OR b.url ILIKE '%' || search_text || '%'
                OR EXISTS (
                    SELECT 1
                    FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                    WHERE key IN ('img_caption', 'ocr')
                      AND value ILIKE '%' || search_text || '%'
                )
            )
        )

    ORDER BY
        CASE
            WHEN search_text IS NULL OR search_text = '' THEN 0
            ELSE (
                similarity(COALESCE(b.url, ''), search_text) * 0.6 +
                similarity(COALESCE(b.title::text, ''), search_text) * 0.5 +
                similarity(COALESCE(b.description, ''), search_text) * 0.3 +
                similarity(COALESCE(b.meta_data->>'ocr', ''), search_text) * 0.1 +
                similarity(COALESCE(b.meta_data->>'img_caption', ''), search_text) * 0.15
            )
        END DESC,
        b.inserted_at DESC;  -- Secondary sort for when search_text is empty
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Flexible bookmark search with optional URL scope, tag scope (array), and category scope (via junction table). Searches across title, description, URL, and metadata with similarity scoring. Returns added_tags and added_categories as JSONB arrays.';

COMMIT;
