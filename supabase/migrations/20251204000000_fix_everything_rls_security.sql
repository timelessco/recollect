-- ============================================================================
-- MIGRATION: Fix Authorization Bypass in everything table RLS (REC-656)
-- Created: 2024-12-04
-- Purpose: Replace insecure USING (true) policy with proper user-scoped access
-- ============================================================================

-- Drop the insecure policy that allowed ANY authenticated user to access ALL bookmarks
DROP POLICY IF EXISTS "auth access" ON "public"."everything";

-- Create secure policy: users can access:
-- 1. Their own bookmarks (created by them)
-- 2. All bookmarks in categories shared with them (as collaborator)
-- 3. All bookmarks in categories they own (as owner, including collaborator's bookmarks)
-- Uses auth.jwt()->>'email' instead of auth.users table to avoid permission issues
CREATE POLICY "user_access_own_bookmarks"
ON "public"."everything"
FOR ALL
TO authenticated
USING (
    -- User created this bookmark
    user_id = auth.uid()
    OR
    -- User is a collaborator in this category (can see all bookmarks in shared categories)
    category_id IN (
        SELECT category_id
        FROM public.shared_categories
        WHERE email = (SELECT auth.jwt()->>'email')
    )
    OR
    -- User owns this category (can see all bookmarks in their own categories, including collaborator's bookmarks)
    category_id IN (
        SELECT id
        FROM public.categories
        WHERE user_id = auth.uid()
    )
);

-- Performance indexes for RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_shared_categories_category_id ON public.shared_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_shared_categories_email ON public.shared_categories (email);
CREATE INDEX IF NOT EXISTS idx_shared_categories_category_id_email ON public.shared_categories (category_id, email);
CREATE INDEX IF NOT EXISTS idx_everything_category_id ON public.everything (category_id);
CREATE INDEX IF NOT EXISTS idx_everything_user_id ON public.everything (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories (user_id);

-- Documentation
COMMENT ON POLICY "user_access_own_bookmarks" ON public.everything IS 
'Allows users to access: (1) their own bookmarks, (2) all bookmarks in categories shared with them as collaborators, (3) all bookmarks in categories they own (including those added by collaborators). Fixes OWASP A01:2021 (Broken Access Control) vulnerability.';