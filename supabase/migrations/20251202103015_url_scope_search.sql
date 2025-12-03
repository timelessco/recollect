-- ============================================================================

-- MIGRATION: optimize RPC search_bookmarks_debugging_url_scope
-- Created: 2025-12-02
-- Purpose:
--   * keep existing search logic but as a dedicated debug RPC
-- Notes:
--   * relies on pg_trgm for similarity scoring, so search_path includes extensions
-- ============================================================================

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_scope(
    search_text character varying,
    url_scope character varying
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
    sort_index text
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
    SET LOCAL pg_trgm.similarity_threshold = 0.6;

    RETURN QUERY
    SELECT b.*
    FROM public.everything b
    WHERE
        (url_scope = '' OR b.url ILIKE '%' || url_scope || '%')
        AND (
            search_text = ''
            OR (
                search_text % ANY(STRING_TO_ARRAY(COALESCE(b.title::text, '') || COALESCE(b.description, ''), ' '))
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
        (
            similarity(COALESCE(b.url, ''), search_text) * 0.6 +
            similarity(COALESCE(b.title::text, ''), search_text) * 0.5 +
            similarity(COALESCE(b.description, ''), search_text) * 0.3 +
            similarity(COALESCE(b.meta_data->>'ocr', ''), search_text) * 0.1 +
            similarity(COALESCE(b.meta_data->>'img_caption', ''), search_text) * 0.15
        ) DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_scope(character varying, character varying) IS
'URL-scoped bookmark search used by the API (debug variant): keeps original search behavior with url_scope filter.';
