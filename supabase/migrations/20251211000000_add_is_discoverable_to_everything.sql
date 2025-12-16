-- ============================================================================
-- MIGRATION: Add is_discoverable column to everything table
-- Created: 2025-12-13
-- Purpose: Add timestamp column to control whether bookmarks are publicly discoverable
-- ============================================================================

BEGIN;

-- Add is_discoverable column to everything table
-- NULL means not discoverable, timestamp means when it was made discoverable
-- Users can explicitly set this to a timestamp for bookmarks they want to make public
ALTER TABLE "public"."everything"
ADD COLUMN IF NOT EXISTS "is_discoverable" timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN "public"."everything"."is_discoverable" IS
'Controls whether this bookmark is publicly discoverable. When NOT NULL and trash is false, the bookmark is visible to anonymous/public users via the public_discover_access RLS policy. The timestamp indicates when the bookmark was made discoverable.';

COMMIT;

