-- ============================================================================
-- Migration: Fix SortOption Spelling Typos
-- ============================================================================
-- Purpose:
--   Correct spelling errors in sort option values stored in JSON columns:
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
--   1. Update existing data using text replacement (handles both flat and keyed JSON)
--   2. Update DEFAULT values for new records
--
-- No table structure changes. Safe to run on production.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Update existing data in profiles.bookmarks_view
-- ============================================================================
-- The bookmarks_view column may contain:
--   - Flat structure: { "sortBy": "date-sort-acending", ... }
--   - Keyed structure: { "everything": { "sortBy": "date-sort-acending", ... }, ... }
-- Text replacement handles both cases.

UPDATE profiles
SET bookmarks_view = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        bookmarks_view::text,
                        'date-sort-acending', 'date-sort-ascending'
                    ),
                    'date-sort-decending', 'date-sort-descending'
                ),
                'alphabetical-sort-acending', 'alphabetical-sort-ascending'
            ),
            'alphabetical-sort-decending', 'alphabetical-sort-descending'
        ),
        'url-sort-acending', 'url-sort-ascending'
    ),
    'url-sort-decending', 'url-sort-descending'
)::json
WHERE bookmarks_view IS NOT NULL
  AND (
    bookmarks_view::text LIKE '%acending%'
    OR bookmarks_view::text LIKE '%decending%'
  );

-- ============================================================================
-- PART 2: Update existing data in categories.category_views
-- ============================================================================

UPDATE categories
SET category_views = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        category_views::text,
                        'date-sort-acending', 'date-sort-ascending'
                    ),
                    'date-sort-decending', 'date-sort-descending'
                ),
                'alphabetical-sort-acending', 'alphabetical-sort-ascending'
            ),
            'alphabetical-sort-decending', 'alphabetical-sort-descending'
        ),
        'url-sort-acending', 'url-sort-ascending'
    ),
    'url-sort-decending', 'url-sort-descending'
)::json
WHERE category_views IS NOT NULL
  AND (
    category_views::text LIKE '%acending%'
    OR category_views::text LIKE '%decending%'
  );

-- ============================================================================
-- PART 3: Update existing data in shared_categories.category_views
-- ============================================================================

UPDATE shared_categories
SET category_views = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        category_views::text,
                        'date-sort-acending', 'date-sort-ascending'
                    ),
                    'date-sort-decending', 'date-sort-descending'
                ),
                'alphabetical-sort-acending', 'alphabetical-sort-ascending'
            ),
            'alphabetical-sort-decending', 'alphabetical-sort-descending'
        ),
        'url-sort-acending', 'url-sort-ascending'
    ),
    'url-sort-decending', 'url-sort-descending'
)::json
WHERE category_views IS NOT NULL
  AND (
    category_views::text LIKE '%acending%'
    OR category_views::text LIKE '%decending%'
  );

-- ============================================================================
-- PART 4: Update DEFAULT values for new records
-- ============================================================================
-- These match the original defaults but with corrected spelling.

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
