-- ============================================================================
-- MIGRATION: Add case-insensitive unique constraints for categories and tags
-- Created: 2025-12-22
-- Purpose: Prevent duplicate category/tag names with different cases (e.g., "Test" and "test")
-- ============================================================================
--
-- This migration:
--   1. Creates case-insensitive unique index on categories (user_id, LOWER(category_name))
--   2. Creates case-insensitive unique index on tags (user_id, LOWER(name))
--
-- These constraints ensure that users cannot create duplicate category/tag names
-- that differ only by case, preventing confusion and data inconsistency.
--
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;
-- ============================================================================
-- PART 1: Categories - Case-insensitive unique constraint
-- ============================================================================

-- Create case-insensitive unique index for categories
-- Prevents "Test" and "test" from existing for the same user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_category_name_ci
  ON public.categories (user_id, LOWER(category_name));

COMMENT ON INDEX public.unique_user_category_name_ci IS
'Case-insensitive unique constraint ensuring users cannot create duplicate category names that differ only by case (e.g., "Test" and "test").';

-- ============================================================================
-- PART 2: Tags - Case-insensitive unique constraint
-- ============================================================================

-- Create case-insensitive unique index for tags
-- Prevents "JavaScript" and "javascript" from existing for the same user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_tag_name_ci
  ON public.tags (user_id, LOWER(name));

COMMENT ON INDEX public.unique_user_tag_name_ci IS
'Case-insensitive unique constraint ensuring users cannot create duplicate tag names that differ only by case (e.g., "JavaScript" and "javascript").';

COMMIT;

