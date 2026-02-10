-- Migration: profiles.bookmarks_view keyed by page slug
-- Purpose: Store per-page view state (everything, discover, images, etc.) in profiles.bookmarks_view
--   instead of a single shared object. Each key holds BookmarkViewDataTypes.
-- Affected: public.profiles (column bookmarks_view, constraint bookmarks_view_check)
-- Data: Existing flat bookmarks_view is wrapped as { "everything": <current value> }.

BEGIN;

-- Step 1: Drop the CHECK constraint that required top-level keys (moodboardColumns, etc.).
--   The new shape has page slugs at top level (everything, discover, images, ...).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS bookmarks_view_check;

-- Step 2: Transform existing flat bookmarks_view into keyed shape.
--   Only rows where bookmarks_view has the legacy flat shape (top-level key 'bookmarksView')
--   are updated; we wrap the current value under the key 'everything'.
--   Column is json type; use ::jsonb for the ? operator and cast result back to json.
UPDATE public.profiles
SET bookmarks_view = (jsonb_build_object('everything', bookmarks_view::jsonb))::json
WHERE bookmarks_view IS NOT NULL
  AND (bookmarks_view::jsonb ? 'bookmarksView');

COMMIT;
