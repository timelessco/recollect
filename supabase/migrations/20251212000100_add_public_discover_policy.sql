-- ============================================================================
-- MIGRATION: Allow public read of discoverable bookmarks
-- Created: 2025-12-12
-- Purpose: Grant anonymous/public SELECT access to discoverable, non-trash rows
-- ============================================================================

BEGIN;

-- Replace any existing policies with the new discoverability rules
DROP POLICY IF EXISTS "anon_discover_access" ON "public"."everything";
DROP POLICY IF EXISTS "authenticated_discover_access" ON "public"."everything";

-- Policy for anonymous (unauthenticated) users
CREATE POLICY "anon_discover_access"
ON "public"."everything"
AS permissive
FOR SELECT
TO anon
USING (
    make_discoverable IS NOT NULL
    AND trash = false
);

COMMENT ON POLICY "anon_discover_access" ON public.everything IS
'Allows anonymous (unauthenticated) users to read bookmarks marked as discoverable and not in trash.';

-- Policy for authenticated users
CREATE POLICY "authenticated_discover_access"
ON "public"."everything"
AS permissive
FOR SELECT
TO authenticated
USING (
    make_discoverable IS NOT NULL
    AND trash = false
);

COMMENT ON POLICY "authenticated_discover_access" ON public.everything IS
'Allows authenticated users to read bookmarks marked as discoverable and not in trash.';

-- Performance indexes for RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_everything_make_discoverable ON public.everything (make_discoverable);
CREATE INDEX IF NOT EXISTS idx_everything_trash ON public.everything (trash);
CREATE INDEX IF NOT EXISTS idx_everything_discoverable_trash ON public.everything (make_discoverable, trash) WHERE make_discoverable IS NOT NULL AND trash = false;

COMMIT;
