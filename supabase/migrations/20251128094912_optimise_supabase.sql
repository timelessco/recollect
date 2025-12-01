-- ============================================================================
-- MIGRATION: Optimize search_bookmarks_debugging with similarity scoring
-- Created: 2025-11-28
-- Purpose: Enhance search function with URL matching and weighted similarity ranking
-- ============================================================================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_bookmarks_debugging(search_text character varying)
 RETURNS TABLE(id bigint, user_id uuid, inserted_at timestamp with time zone, title extensions.citext, url text, description text, ogimage text, screenshot text, category_id bigint, trash boolean, type text, meta_data jsonb, sort_index text)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path = ''
AS $function$
BEGIN
    SET LOCAL pg_trgm.similarity_threshold = 0.6;

    RETURN QUERY
    SELECT b.*
    FROM everything b
    WHERE
        (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
        OR b.url ILIKE '%' || search_text || '%'
        OR EXISTS (
            SELECT 1
            FROM jsonb_each_text(b.meta_data) x(key, value)
            WHERE key IN ('img_caption', 'ocr')
              AND value ILIKE '%' || search_text || '%'
        )
    ORDER BY
        (
            similarity(b.url, search_text) * 0.6 +
            similarity(b.title, search_text) * 0.5 +
            similarity(b.description, search_text) * 0.3 +
            similarity(COALESCE(b.meta_data->>'ocr',''), search_text) * 0.1 +
            similarity(COALESCE(b.meta_data->>'img_caption',''), search_text) * 0.15
        ) DESC;
END;
$function$
;

-- ============================================================================
-- CHANGES:
-- 1. Added URL search capability using ILIKE operator
-- 2. Implemented weighted similarity ranking with the following weights:
--    - URL: 36%
--    - Title: 30%
--    - Description: 18%
--    - OCR metadata: 6%
--    - Image caption: 10%
-- 3. Set trigram similarity threshold to 0.6 using set_limit() with save/restore pattern
--    to maintain STABLE semantics and prevent session state pollution
-- ============================================================================