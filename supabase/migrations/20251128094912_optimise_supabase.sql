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
AS $function$BEGIN
    PERFORM public.set_limit(0.6);

    RETURN QUERY
    SELECT b.*
    FROM public.everything b
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
        similarity(b.url, search_text) * 0.36 +
        similarity(b.title, search_text) * 0.30 +
        similarity(b.description, search_text) * 0.18 +
        similarity(COALESCE(b.meta_data->>'ocr',''), search_text) * 0.06 +
        similarity(COALESCE(b.meta_data->>'img_caption',''), search_text) * 0.10
    ) DESC;
END;$function$
;

-- ============================================================================
-- CHANGES MADE:
-- 1. Added URL search: OR b.url ILIKE '%' || search_text || '%'
-- 2. Added similarity-based ranking with weighted scoring:
--    - URL: 36%
--    - Title: 30%
--    - Description: 18%
--    - OCR metadata: 6%
--    - Image caption: 10%
-- 3. Set trigram threshold to 0.6 for better fuzzy matching
-- ============================================================================


