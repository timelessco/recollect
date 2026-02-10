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

-- Step 3: Add CHECK so bookmarks_view is either NULL or a valid JSON object (keyed or legacy).
--   Postgres does not allow subqueries in CHECK; use an immutable helper that validates shape.
--   Accepts (1) keyed shape: top-level keys are page slugs, each value is BookmarkViewDataTypes;
--   (2) legacy flat shape: single object with bookmarksView, cardContentViewArray, moodboardColumns, sortBy
--   so that seed data and pre-migration rows can coexist until normalised.
CREATE OR REPLACE FUNCTION public.check_bookmarks_view_keyed_shape(v jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(v) = 'object'
    AND (
      -- Legacy flat: top-level has the four BookmarkViewDataTypes keys
      (
        v ? 'bookmarksView'
        AND v ? 'cardContentViewArray'
        AND v ? 'moodboardColumns'
        AND v ? 'sortBy'
        AND jsonb_typeof(v->'bookmarksView') = 'string'
        AND jsonb_typeof(v->'cardContentViewArray') = 'array'
        AND jsonb_typeof(v->'moodboardColumns') = 'array'
        AND jsonb_typeof(v->'sortBy') = 'string'
      )
      OR
      -- Keyed: non-empty object and every value is a BookmarkViewDataTypes object
      (
        v != '{}'::jsonb
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_each(v) AS kv(key, val)
          WHERE jsonb_typeof(val) != 'object'
            OR NOT (
              val ? 'bookmarksView'
              AND val ? 'cardContentViewArray'
              AND val ? 'moodboardColumns'
              AND val ? 'sortBy'
            )
            OR jsonb_typeof(val->'bookmarksView') != 'string'
            OR jsonb_typeof(val->'cardContentViewArray') != 'array'
            OR jsonb_typeof(val->'moodboardColumns') != 'array'
            OR jsonb_typeof(val->'sortBy') != 'string'
        )
      )
    );
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT bookmarks_view_check
  CHECK (
    bookmarks_view IS NULL
    OR public.check_bookmarks_view_keyed_shape(bookmarks_view::jsonb)
  );

COMMIT;
