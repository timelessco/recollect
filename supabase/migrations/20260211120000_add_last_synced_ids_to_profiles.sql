-- ============================================================================
-- MIGRATION: Add last-synced ID columns to profiles
-- Purpose: Track the last synced Instagram/Twitter post ID per user for
--          incremental sync (avoids re-importing already-synced posts)
-- Affected table: public.profiles
-- ============================================================================
--
-- This migration:
--   1. Adds last_synced_instagram_id (text, nullable) to profiles
--   2. Adds last_synced_twitter_id (text, nullable) to profiles
--
-- No new RLS policies needed — existing profiles RLS covers these columns.
-- No indexes needed — lookups are by id (primary key).
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add columns to profiles table
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN last_synced_instagram_id text,
  ADD COLUMN last_synced_twitter_id text;

COMMENT ON COLUMN public.profiles.last_synced_instagram_id IS
  'ID of the last synced Instagram post for incremental sync. NULL if never synced.';

COMMENT ON COLUMN public.profiles.last_synced_twitter_id IS
  'ID of the last synced Twitter post for incremental sync. NULL if never synced.';

COMMIT;
