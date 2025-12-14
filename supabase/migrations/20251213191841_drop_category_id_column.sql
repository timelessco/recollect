-- ============================================================================
-- MIGRATION: Drop deprecated category_id column from everything table
-- Created: 2024-12-13
-- Purpose: Complete many-to-many migration - junction table is now sole source of truth
-- Phase: 6 (Final cleanup)
-- ============================================================================

BEGIN;

-- 1. Drop the existing RLS policy that references category_id
DROP POLICY IF EXISTS "user_access_own_bookmarks" ON "public"."everything";

-- 2. Create new RLS policy using junction table for collaborator/owner access
CREATE POLICY "user_access_own_bookmarks"
ON "public"."everything"
FOR ALL
TO authenticated
USING (
    -- User created this bookmark
    user_id = (SELECT auth.uid())
    OR
    -- User is a collaborator in any of this bookmark's categories (via junction table)
    id IN (
        SELECT bc.bookmark_id
        FROM public.bookmark_categories bc
        INNER JOIN public.shared_categories sc ON bc.category_id = sc.category_id
        WHERE sc.email = (SELECT auth.jwt()->>'email')
    )
    OR
    -- User owns any of this bookmark's categories (via junction table)
    id IN (
        SELECT bc.bookmark_id
        FROM public.bookmark_categories bc
        INNER JOIN public.categories c ON bc.category_id = c.id
        WHERE c.user_id = (SELECT auth.uid())
    )
);

-- Update documentation
COMMENT ON POLICY "user_access_own_bookmarks" ON public.everything IS
'Allows users to access: (1) their own bookmarks, (2) all bookmarks in categories shared with them as collaborators (via junction table), (3) all bookmarks in categories they own (via junction table). Updated for many-to-many category relationship.';

-- 3. Drop index on category_id
DROP INDEX IF EXISTS idx_everything_category_id;

-- 4. Drop foreign key constraints
ALTER TABLE public.everything DROP CONSTRAINT IF EXISTS bookmarks_category_id_fkey;
ALTER TABLE public.everything DROP CONSTRAINT IF EXISTS everything_category_id_fkey;

-- 5. Drop the column
ALTER TABLE public.everything DROP COLUMN IF EXISTS category_id;

COMMIT;
