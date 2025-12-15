-- ============================================================================
-- MIGRATION: Add is_discoverable column to everything table
-- Created: 2025-12-13
-- Purpose: Add boolean column to control whether bookmarks are publicly discoverable
-- ============================================================================

BEGIN;

-- Add is_discoverable column to everything table
-- Defaults to false so existing and new rows are not discoverable by default
-- Users can explicitly set this to true for bookmarks they want to make public
ALTER TABLE "public"."everything"
ADD COLUMN IF NOT EXISTS "is_discoverable" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."everything"."is_discoverable" IS
'Controls whether this bookmark is publicly discoverable. When true and trash is false, the bookmark is visible to anonymous/public users via the public_discover_access RLS policy.';

COMMIT;

