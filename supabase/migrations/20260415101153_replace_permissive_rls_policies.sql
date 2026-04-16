-- ============================================================================
-- MIGRATION: Replace permissive RLS policies with scoped predicates
-- Created: 2026-04-15
-- Purpose: Harden row-level security on profiles, categories, shared_categories,
--          tags, bookmark_tags. The previous `USING (true)` policies allowed any
--          authenticated user to read/write any other user's rows via direct
--          Supabase client calls with the browser anon key.
-- ============================================================================
--
-- This migration:
--   1. Drops the permissive "auth access" / "auth acceess" policies on the
--      five target tables
--   2. Replaces them with per-operation policies scoped to ownership, with
--      shared-collection visibility preserved via the shared_categories email
--      subquery (same shape as bookmark_categories / everything)
--   3. Verifies post-migration state (expected policy names exist; no
--      surviving `USING (true)` on any target table)
--
-- Non-goals (accepted residual exposure):
--   - Column-level restriction on profiles billing columns — billing is
--     experimental, no frontend; address when billing ships
--   - Tightening shared-collection access to accepted-only invitees —
--     bookmark_categories and everything already grant pending-invitee
--     preview, diverging would create cross-policy inconsistency
--   - Broadening tags / bookmark_tags to shared-collection members — strict
--     self-only by product decision
-- ============================================================================

BEGIN;

SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Drop permissive policies
-- ============================================================================
-- Misspellings ("acceess") match the live policy names in 20251105181644_prod_schema.sql

DROP POLICY IF EXISTS "auth acceess" ON public.profiles;
DROP POLICY IF EXISTS "auth access"  ON public.categories;
DROP POLICY IF EXISTS "auth acceess" ON public.tags;
DROP POLICY IF EXISTS "auth access"  ON public.bookmark_tags;
DROP POLICY IF EXISTS "auth acceess" ON public.shared_categories;

-- ============================================================================
-- PART 2: profiles
-- ============================================================================
-- Self-read plus read-through for collaborators via shared_categories.
-- handle_new_user (SECURITY DEFINER) bypasses RLS, so signup is unaffected.

CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT TO authenticated
USING (
    id = (SELECT auth.uid())
    OR
    id IN (
        SELECT user_id
        FROM public.categories
        WHERE id IN (
            SELECT category_id
            FROM public.shared_categories
            WHERE email = (SELECT auth.jwt()->>'email')
        )
    )
);

CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_delete"
ON public.profiles FOR DELETE TO authenticated
USING (id = (SELECT auth.uid()));

-- ============================================================================
-- PART 3: categories
-- ============================================================================
-- Owner, public, and collaborator reads. Anon gets public-only to keep
-- /discover working. Mutations are strict owner-only; collaborator edits
-- target bookmark_categories, not categories metadata.

CREATE POLICY "categories_select_authenticated"
ON public.categories FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR is_public = true
    OR id IN (
        SELECT category_id
        FROM public.shared_categories
        WHERE email = (SELECT auth.jwt()->>'email')
    )
);

CREATE POLICY "categories_select_public"
ON public.categories FOR SELECT TO anon
USING (is_public = true);

CREATE POLICY "categories_insert"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "categories_update"
ON public.categories FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "categories_delete"
ON public.categories FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 4: shared_categories
-- ============================================================================
-- user_id stores the owner's UUID; email identifies the invitee. Owner
-- manages invites; invitee can accept (UPDATE is_accept_pending=false) or
-- leave (DELETE) by matching their JWT email. Column-level invariants for
-- invitees are enforced by the BEFORE UPDATE guard trigger below.

CREATE POLICY "shared_categories_select"
ON public.shared_categories FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR email = (SELECT auth.jwt()->>'email')
);

-- Insert: caller must own the category being shared. Prevents an
-- authenticated user from inserting {category_id: <someone_else_s>,
-- email: <their_own>, user_id: auth.uid()} and self-granting read
-- access to a private collection.
CREATE POLICY "shared_categories_insert"
ON public.shared_categories FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND category_id IN (
        SELECT id FROM public.categories
        WHERE user_id = (SELECT auth.uid())
    )
);

-- Update: split by role so invitees cannot rewrite invite metadata.
-- Owners can touch their own rows; WITH CHECK re-asserts category
-- ownership so a malicious owner-row cannot be redirected to a
-- category they don't own (defense in depth, mirrors insert).
CREATE POLICY "shared_categories_update_owner"
ON public.shared_categories FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND category_id IN (
        SELECT id FROM public.categories
        WHERE user_id = (SELECT auth.uid())
    )
);

-- Invitees may update only acceptance state and their per-invite
-- view preferences. Column-level enforcement lives in the BEFORE UPDATE
-- trigger below (Postgres RLS cannot restrict by column).
CREATE POLICY "shared_categories_update_invitee"
ON public.shared_categories FOR UPDATE TO authenticated
USING (email = (SELECT auth.jwt()->>'email'))
WITH CHECK (email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "shared_categories_delete"
ON public.shared_categories FOR DELETE TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR email = (SELECT auth.jwt()->>'email')
);

-- Invitee column guard: when the current row is NOT owned by the
-- caller (i.e. they're matching via email), the only columns they
-- may mutate are is_accept_pending and category_views. Blocks
-- self-escalation of edit_access, redirecting category_id to a
-- private collection, and overwriting user_id to DoS the owner's
-- management of the invite.
CREATE OR REPLACE FUNCTION public.shared_categories_invitee_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF OLD.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
        IF NEW.user_id       IS DISTINCT FROM OLD.user_id
        OR NEW.category_id   IS DISTINCT FROM OLD.category_id
        OR NEW.email         IS DISTINCT FROM OLD.email
        OR NEW.edit_access   IS DISTINCT FROM OLD.edit_access THEN
            RAISE EXCEPTION
                'Invitees may only update is_accept_pending and category_views';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER shared_categories_invitee_update_guard
BEFORE UPDATE ON public.shared_categories
FOR EACH ROW
EXECUTE FUNCTION public.shared_categories_invitee_update_guard();

-- ============================================================================
-- PART 5: tags
-- ============================================================================
-- Strict self-only. Collaborators will not see the owner's tag chips on
-- shared bookmarks — accepted trade-off.

CREATE POLICY "tags_select"
ON public.tags FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "tags_insert"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "tags_update"
ON public.tags FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "tags_delete"
ON public.tags FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 6: bookmark_tags
-- ============================================================================
-- Strict self-only.

CREATE POLICY "bookmark_tags_select"
ON public.bookmark_tags FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Junction inserts/updates must prove ownership of BOTH sides.
-- Without the bookmark_id / tag_id subqueries, a caller could
-- insert {bookmark_id: <another_user's>, tag_id: <their_own>,
-- user_id: auth.uid()} — FK constraints only enforce existence,
-- not RLS, and the unique (tag_id, bookmark_id) pair could be
-- used to pollute or reserve another user's tag associations.
CREATE POLICY "bookmark_tags_insert"
ON public.bookmark_tags FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND bookmark_id IN (
        SELECT id FROM public.everything
        WHERE user_id = (SELECT auth.uid())
    )
    AND tag_id IN (
        SELECT id FROM public.tags
        WHERE user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "bookmark_tags_update"
ON public.bookmark_tags FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND bookmark_id IN (
        SELECT id FROM public.everything
        WHERE user_id = (SELECT auth.uid())
    )
    AND tag_id IN (
        SELECT id FROM public.tags
        WHERE user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "bookmark_tags_delete"
ON public.bookmark_tags FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 7: Post-migration verification
-- ============================================================================

DO $$
DECLARE
    expected_policies text[] := ARRAY[
        'profiles:profiles_select',
        'profiles:profiles_insert',
        'profiles:profiles_update',
        'profiles:profiles_delete',
        'categories:categories_select_authenticated',
        'categories:categories_select_public',
        'categories:categories_insert',
        'categories:categories_update',
        'categories:categories_delete',
        'shared_categories:shared_categories_select',
        'shared_categories:shared_categories_insert',
        'shared_categories:shared_categories_update_owner',
        'shared_categories:shared_categories_update_invitee',
        'shared_categories:shared_categories_delete',
        'tags:tags_select',
        'tags:tags_insert',
        'tags:tags_update',
        'tags:tags_delete',
        'bookmark_tags:bookmark_tags_select',
        'bookmark_tags:bookmark_tags_insert',
        'bookmark_tags:bookmark_tags_update',
        'bookmark_tags:bookmark_tags_delete'
    ];
    missing text;
    permissive_count int;
BEGIN
    FOREACH missing IN ARRAY expected_policies LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename  = split_part(missing, ':', 1)
              AND policyname = split_part(missing, ':', 2)
        ) THEN
            RAISE EXCEPTION 'Missing expected RLS policy: %', missing;
        END IF;
    END LOOP;

    SELECT count(*) INTO permissive_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
          'profiles', 'categories', 'shared_categories', 'tags', 'bookmark_tags'
      )
      AND (qual = 'true' OR with_check = 'true');

    IF permissive_count > 0 THEN
        RAISE EXCEPTION
            'Found % residual permissive RLS predicate(s) on target tables',
            permissive_count;
    END IF;

    RAISE NOTICE 'RLS hardening verified: 22 scoped policies in place, no residual permissive predicates';
END $$;

COMMIT;
