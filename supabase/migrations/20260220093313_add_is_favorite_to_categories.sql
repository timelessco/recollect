-- ============================================================================
-- MIGRATION: Add is_favorite column to categories table
-- Created: 2026-02-20
-- Purpose:
--   Allow users to pin collections to a dedicated "Favorites" section in the
--   sidebar. When is_favorite = TRUE, the collection appears under the
--   Favorites header.
--
-- Affected:
--   - public.categories (new column: is_favorite)
--
-- No RLS changes. Safe to run on production.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- Pre-flight validation
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    RAISE EXCEPTION 'Migration blocked: public.categories table does not exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'is_favorite'
  ) THEN
    RAISE EXCEPTION 'Migration blocked: is_favorite column already exists on public.categories.';
  END IF;
END $$;

-- ============================================================================
-- PART 1: Add is_favorite column
-- ============================================================================

ALTER TABLE public.categories
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.categories.is_favorite IS
'Whether this collection is marked as a favorite by the owner. Favorites appear in a dedicated section in the sidebar.';

-- ============================================================================
-- Post-migration verification
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'is_favorite'
  ) THEN
    RAISE EXCEPTION 'Migration failed: is_favorite column was not created.';
  END IF;

  RAISE NOTICE 'Migration verified: is_favorite column added to public.categories successfully.';
END $$;

COMMIT;
