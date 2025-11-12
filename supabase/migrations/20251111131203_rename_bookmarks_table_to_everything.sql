-- ============================================================================
-- MIGRATION: Safe Rename of bookmarks_table to everything
-- Created: 2024-11-11
-- Purpose: Rename table while preserving ALL data, sequences, and dependencies
-- ============================================================================

-- IMPORTANT: This migration is safe and will NOT lose any data
-- It uses ALTER TABLE RENAME which preserves:
-- - All data
-- - Sequences and auto-increment values
-- - Foreign key relationships
-- - Row-level security policies (need to be recreated)
-- - Grants (preserved automatically)

BEGIN;

-- ============================================================================
-- STEP 1: Drop and recreate RLS policy (policies are not auto-renamed)
-- ============================================================================
DROP POLICY IF EXISTS "auth access" ON "public"."bookmarks_table";

-- ============================================================================
-- STEP 2: Rename the table
-- ============================================================================
-- This automatically updates:
-- - The table name
-- - Foreign key references from bookmark_tags table
-- - The sequence ownership
-- - Default value expression for id column
ALTER TABLE "public"."bookmarks_table" RENAME TO "everything";

-- ============================================================================
-- STEP 3: Rename the sequence
-- ============================================================================
ALTER SEQUENCE "public"."bookmarks_table_id_seq" RENAME TO "everything_id_seq";

-- ============================================================================
-- STEP 4: Rename indexes
-- ============================================================================
ALTER INDEX IF EXISTS "public"."idx_title_description" RENAME TO "everything_idx_title_description";
ALTER INDEX IF EXISTS "public"."todos_pkey" RENAME TO "everything_pkey";
ALTER INDEX IF EXISTS "public"."unique_url_category_id" RENAME TO "everything_unique_url_category_id";

-- ============================================================================
-- STEP 5: Rename constraints (only if they exist with old names)
-- ============================================================================
-- Note: Some constraints may have been auto-renamed when the table was renamed
-- We use DO blocks to check if constraints exist before renaming

-- Primary key constraint (if it still has the old name)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'todos_pkey' AND conrelid = 'public.everything'::regclass) THEN
        ALTER TABLE "public"."everything" RENAME CONSTRAINT "todos_pkey" TO "everything_pkey";
    END IF;
END $$;

-- Foreign key constraints (if they still have old names)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_table_category_id_fkey' AND conrelid = 'public.everything'::regclass) THEN
        ALTER TABLE "public"."everything" RENAME CONSTRAINT "bookmarks_table_category_id_fkey" TO "everything_category_id_fkey";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_table_user_id_fkey' AND conrelid = 'public.everything'::regclass) THEN
        ALTER TABLE "public"."everything" RENAME CONSTRAINT "bookmarks_table_user_id_fkey" TO "everything_user_id_fkey";
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Recreate RLS policy with new table name
-- ============================================================================
CREATE POLICY "auth access"
  ON "public"."everything"
  AS permissive
  FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 7: Update search functions to reference new table name
-- ============================================================================

-- Function: search_bookmarks()
CREATE OR REPLACE FUNCTION public.search_bookmarks(search_text character varying)
 RETURNS TABLE(id bigint, user_id uuid, inserted_at timestamp with time zone, title extensions.citext, url text, description text, ogimage text, screenshot text, category_id bigint, trash boolean, type text, meta_data jsonb, sort_index text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
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
        FROM everything b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$;

-- Function: search_bookmarks_debug()
CREATE OR REPLACE FUNCTION public.search_bookmarks_debug(search_text text)
 RETURNS TABLE(id bigint, title text, has_meta boolean, caption text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$BEGIN
    RETURN QUERY
        SELECT
            b.id,
            b.title::text,
            (b.meta_data IS NOT NULL) as has_meta,
            COALESCE(b.meta_data->>'img_caption', '') as caption
        FROM everything b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$;

-- Function: search_bookmarks_debugging()
CREATE OR REPLACE FUNCTION public.search_bookmarks_debugging(search_text character varying)
 RETURNS TABLE(id bigint, user_id uuid, inserted_at timestamp with time zone, title extensions.citext, url text, description text, ogimage text, screenshot text, category_id bigint, trash boolean, type text, meta_data jsonb, sort_index text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$BEGIN
    RETURN QUERY
        SELECT *
        FROM everything b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$function$;

-- ============================================================================
-- STEP 8: Verify migration (optional - uncomment to use)
-- ============================================================================
SELECT COUNT(*) as total_records FROM public.everything;
SELECT * FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'everything_id_seq';
SELECT conname FROM pg_constraint WHERE conrelid = 'public.everything'::regclass;

COMMIT;
