-- Migration: Wrap orphaned flat bookmarks_view into keyed format
-- Purpose: Convert any remaining legacy flat bookmarks_view records
--   (top-level bookmarksView key) into keyed format ({ "everything": {...} }).
--   The keyed migration (20260210) converted existing data, but:
--     1. Seed data re-inserts flat format on db reset
--     2. The spelling fix migration (20260214) briefly reset the column default to flat,
--        so profiles created in that window got flat values
-- Affected: public.profiles (column bookmarks_view)

BEGIN;

-- Wrap flat bookmarks_view under "everything" key
UPDATE public.profiles
SET bookmarks_view = (jsonb_build_object('everything', bookmarks_view::jsonb))::json
WHERE bookmarks_view IS NOT NULL
  AND (bookmarks_view::jsonb ? 'bookmarksView')
  AND NOT (bookmarks_view::jsonb ? 'everything');

COMMIT;
