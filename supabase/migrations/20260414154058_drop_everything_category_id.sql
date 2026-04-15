-- ============================================================================
-- MIGRATION: Drop legacy everything.category_id column and dead search RPCs
-- Created: 2026-04-14
-- Purpose:
--   * Finish the column-drop that 20251208115323_bookmark_categories_many_to_many.sql skipped.
--   * `bookmark_categories` (junction table) is the sole source of truth since Dec 2025.
-- Notes:
--   * `search_bookmarks_url_tag_scope` is the live junction-based RPC and stays untouched.
--   * `search_bookmarks_debugging` has two overloads (single-arg + two-arg). Both must drop
--     before the ALTER TABLE — otherwise a dependency error blocks the column drop.
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_bookmarks(character varying);
DROP FUNCTION IF EXISTS public.search_bookmarks_debugging(character varying);
DROP FUNCTION IF EXISTS public.search_bookmarks_debugging(character varying, character varying);

ALTER TABLE public.everything DROP COLUMN category_id;
