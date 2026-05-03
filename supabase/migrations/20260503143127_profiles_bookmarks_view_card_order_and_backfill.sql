-- Migration: Update profiles.bookmarks_view default + backfill old default rows
-- Purpose: Replace the moodboard column DEFAULT on profiles.bookmarks_view (set by
--   20260214120000) with a refreshed value whose cardContentViewArray order is
--   ["title","cover","info"] instead of ["cover","title","info"], and reset existing
--   rows that still carry the exact old default.
-- Affected:
--   public.profiles (column bookmarks_view)
-- Background:
--   The 20260214120000 spelling-fix migration set the column DEFAULT to a moodboard
--   view with cardContentViewArray=["cover","title","info"], so every account created
--   since then inherited that opinionated configuration. The 20260324120000 wrap
--   migration converted flat profile rows into keyed shape but did NOT change the
--   column default, so rows created after Mar 24 still hold the flat bad value.
--   Backfill matches both shapes (flat + wrapped) by exact JSONB equality so
--   legitimately customized rows stay untouched.
--
--   categories.category_views and shared_categories.category_views are NOT touched
--   here. Their existing default is read defensively by the frontend (optional
--   chaining + caller-provided fallbacks in useGetViewValue), so the value is
--   harmless in place and any change would churn rows for no UI benefit.
--
-- New default value (matches BookmarkViewDataTypes — satisfies the existing
-- check_bookmarks_view_keyed_shape CHECK on profiles.bookmarks_view):
--   {"sortBy":"date-sort-ascending","bookmarksView":"moodboard","moodboardColumns":[30],"cardContentViewArray":["title","cover","info"]}
--
-- profiles.bookmarks_view wraps the value under the "everything" page key
-- (page-keyed since 20260210).

BEGIN;

-- PART 1: Replace column DEFAULT on profiles.bookmarks_view
-- ============================================================================

ALTER TABLE public.profiles
  ALTER COLUMN bookmarks_view
  SET DEFAULT '{"everything":{"sortBy":"date-sort-ascending","bookmarksView":"moodboard","moodboardColumns":[30],"cardContentViewArray":["title","cover","info"]}}'::json;

-- PART 2: Backfill profile rows that hold the exact old default
-- ============================================================================
-- profiles.bookmarks_view can hold the bad default in two shapes:
--   a) flat: rows created after 20260324 wrap (column default still flat)
--   b) wrapped: rows created Feb 14 – Mar 24, wrapped by 20260324 migration

UPDATE public.profiles
SET bookmarks_view = '{"everything":{"sortBy":"date-sort-ascending","bookmarksView":"moodboard","moodboardColumns":[30],"cardContentViewArray":["title","cover","info"]}}'::json
WHERE bookmarks_view IS NOT NULL
  AND bookmarks_view::jsonb IN (
    '{"moodboardColumns":[30],"cardContentViewArray":["cover","title","info"],"bookmarksView":"moodboard","sortBy":"date-sort-ascending"}'::jsonb,
    '{"everything":{"moodboardColumns":[30],"cardContentViewArray":["cover","title","info"],"bookmarksView":"moodboard","sortBy":"date-sort-ascending"}}'::jsonb
  );

-- PART 3: Verification
-- ============================================================================
DO $$
DECLARE
  v_bad_profiles int;
  v_profiles_default text;
BEGIN
  -- Verify no profile rows still hold the old default JSON (either shape)
  SELECT count(*) INTO v_bad_profiles
  FROM public.profiles
  WHERE bookmarks_view IS NOT NULL
    AND bookmarks_view::jsonb IN (
      '{"moodboardColumns":[30],"cardContentViewArray":["cover","title","info"],"bookmarksView":"moodboard","sortBy":"date-sort-ascending"}'::jsonb,
      '{"everything":{"moodboardColumns":[30],"cardContentViewArray":["cover","title","info"],"bookmarksView":"moodboard","sortBy":"date-sort-ascending"}}'::jsonb
    );

  IF v_bad_profiles > 0 THEN
    RAISE EXCEPTION 'Old-default backfill incomplete: % profile rows still match', v_bad_profiles;
  END IF;

  -- Verify profiles.bookmarks_view DEFAULT was updated. Old vs new differ only in
  -- cardContentViewArray order (["cover","title","info"] vs ["title","cover","info"]),
  -- so anchor on the new array literal.
  SELECT column_default INTO v_profiles_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bookmarks_view';

  IF v_profiles_default LIKE '%["cover","title","info"]%' OR v_profiles_default NOT LIKE '%["title","cover","info"]%' THEN
    RAISE EXCEPTION 'profiles.bookmarks_view default not updated: %', v_profiles_default;
  END IF;

  RAISE NOTICE 'Verification passed: profiles.bookmarks_view default updated, no old-default profile rows remain';
END $$;

COMMIT;
