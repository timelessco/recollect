-- ============================================================================
-- MIGRATION: optimize RPC search_bookmarks_url_tag_scope
-- Created: 2025-12-03
-- Purpose:
--   * flexible bookmark search with optional url_scope and tag_scope (array)
--   * supports searching across title, description, url, and metadata
-- Notes:
--   * relies on pg_trgm for similarity scoring, so search_path includes extensions
--   * tag_scope accepts an array of tag names for filtering
-- ============================================================================

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL
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
    make_discoverable timestamp with time zone,
    added_tags jsonb
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
        ) AS added_tags
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

-- ============================================================================
-- Indexes to support search performance
-- ============================================================================

-- B-tree indexes for joins and exact matches
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmark_id
    ON public.bookmark_tags (bookmark_id);

CREATE INDEX IF NOT EXISTS idx_tags_name
    ON public.tags (name);

-- ============================================================================
-- Trigram GIN indexes for ILIKE pattern matching (performance optimization)
-- Without these, ILIKE '%text%' causes full table scans
-- ============================================================================

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- For URL searches with ILIKE '%url%'
CREATE INDEX IF NOT EXISTS idx_everything_url_trgm
    ON public.everything USING GIN (url gin_trgm_ops);

-- For title searches (used in similarity scoring)
CREATE INDEX IF NOT EXISTS idx_everything_title_trgm
    ON public.everything USING GIN (title gin_trgm_ops);

-- For description searches (used in similarity scoring)
CREATE INDEX IF NOT EXISTS idx_everything_description_trgm
    ON public.everything USING GIN (description gin_trgm_ops);

-- For tag name searches (if we add ILIKE for tags in future)
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
    ON public.tags USING GIN (name gin_trgm_ops);

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[]) IS
'Flexible bookmark search with optional URL scope and tag scope (array support). Searches across title, description, URL, and metadata with similarity scoring. Uses pg_trgm GIN indexes for ILIKE performance.';