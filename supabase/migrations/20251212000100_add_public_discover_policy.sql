-- ============================================================================
-- MIGRATION: Allow public read of discoverable bookmarks
-- Created: 2025-12-12
-- Purpose: Grant anonymous/public SELECT access to discoverable, non-trash rows
-- ============================================================================

BEGIN;

-- Replace any existing policy with the new discoverability rule
DROP POLICY IF EXISTS "public_discover_access" ON "public"."everything";

CREATE POLICY "public_discover_access"
ON "public"."everything"
AS permissive
FOR SELECT
TO public
USING (
    is_discoverable = true
    AND trash = false
);

COMMENT ON POLICY "public_discover_access" ON public.everything IS
'Allows anyone (including anonymous) to read bookmarks marked as discoverable and not in trash.';

COMMIT;
