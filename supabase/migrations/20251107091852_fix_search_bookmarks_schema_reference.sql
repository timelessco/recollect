-- ============================================================================
-- MIGRATION: Fix search_bookmarks functions to use correct search_path
-- Created: 2025-11-07
-- Issue: Functions have SET search_path TO '' but reference:
--        1. bookmarks_table without schema prefix (causing "relation does not exist")
--        2. pg_trgm operator % without extensions in search_path (causing "operator does not exist")
-- Fix: Change search_path to public, extensions to include both schemas
-- ============================================================================

set check_function_bodies = off;

-- Function: search_bookmarks() - Full-text search across bookmarks
-- Fix: Set search_path to include public and extensions schemas
CREATE OR REPLACE FUNCTION public.search_bookmarks(search_text character varying)
 RETURNS TABLE(id bigint, user_id uuid, inserted_at timestamp with time zone, title extensions.citext, url text, description text, ogimage text, screenshot text, category_id bigint, trash boolean, type text, meta_data jsonb, sort_index text)
 LANGUAGE plpgsql
 SET search_path TO public, extensions
AS $function$BEGIN
    RETURN QUERY
        SELECT
            b.id,
            b.user_id,
            b.inserted_at,
            b.title,
            b.url,
            b.description,
            b."ogImage",
            b.screenshot,
            b.category_id,
            b.trash,
            b.type,
            b.meta_data,
            b.sort_index
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$
;

-- Function: search_bookmarks_debug() - Simplified search for debugging
-- Fix: Set search_path to include public and extensions schemas
CREATE OR REPLACE FUNCTION public.search_bookmarks_debug(search_text text)
 RETURNS TABLE(id bigint, title text, has_meta boolean, caption text)
 LANGUAGE plpgsql
 SET search_path TO public, extensions
AS $function$BEGIN
    RETURN QUERY
        SELECT
            b.id,
            b.title::text,
            (b.meta_data IS NOT NULL) as has_meta,
            COALESCE(b.meta_data->>'img_caption', '') as caption
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$
;

-- Function: search_bookmarks_debugging() - Full search with wildcard return
-- Fix: Set search_path to include public and extensions schemas
CREATE OR REPLACE FUNCTION public.search_bookmarks_debugging(search_text character varying)
 RETURNS TABLE(id bigint, user_id uuid, inserted_at timestamp with time zone, title extensions.citext, url text, description text, ogimage text, screenshot text, category_id bigint, trash boolean, type text, meta_data jsonb, sort_index text)
 LANGUAGE plpgsql
 SET search_path TO public, extensions
AS $function$BEGIN
    RETURN QUERY
        SELECT *
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$
;
