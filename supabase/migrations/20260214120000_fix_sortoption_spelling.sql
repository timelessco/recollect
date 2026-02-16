-- ============================================================================
-- Migration: Fix SortOption Spelling Typos
-- ============================================================================
-- Purpose:
--   Correct spelling errors in sort option values stored in JSON columns(default values):
--     - "acending" → "ascending"
--     - "decending" → "descending"
--
-- Affected:
--   - public.profiles (column: bookmarks_view)
--   - public.categories (column: category_views)
--   - public.shared_categories (column: category_views)
--
-- Background:
--   The original schema used misspelled sort values (e.g., "date-sort-acending").
--   This caused issues when AI-generated code used correct spelling - the API
--   would ignore the sort parameter and default to recent-first sorting.
--
-- Strategy:
--   1. Update existing data using text replacement directly in sql editor (handles both flat and keyed JSON)
--   2. Update DEFAULT values for new records
--
-- No table structure changes. Safe to run on production.
-- ============================================================================

BEGIN;

ALTER TABLE profiles
ALTER COLUMN bookmarks_view
SET DEFAULT '{"moodboardColumns": [30], "cardContentViewArray": ["cover", "title", "info"], "bookmarksView": "moodboard", "sortBy": "date-sort-ascending"}'::json;

ALTER TABLE categories
ALTER COLUMN category_views
SET DEFAULT '{"moodboardColumns": [30], "cardContentViewArray": ["cover", "title", "info"], "bookmarksView": "moodboard", "sortBy": "date-sort-ascending"}'::json;

ALTER TABLE shared_categories
ALTER COLUMN category_views
SET DEFAULT '{"moodboardColumns": [30], "cardContentViewArray": ["cover", "title", "info"], "bookmarksView": "moodboard", "sortBy": "date-sort-ascending"}'::json;

COMMIT;