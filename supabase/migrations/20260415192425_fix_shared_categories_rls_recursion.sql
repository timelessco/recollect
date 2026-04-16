-- ============================================================================
-- MIGRATION: Break shared_categories <-> categories RLS recursion (42P17)
-- Created: 2026-04-15
-- Purpose: Fix infinite recursion detected in policy for relation
--          "shared_categories" reported in production after PR #937
--          (migration 20260415101153_replace_permissive_rls_policies.sql).
-- ============================================================================
--
-- Failure mechanism (reproduced locally, confirmed in prod Axiom logs):
--   - shared_categories_insert / shared_categories_update_owner WITH CHECK
--     contain:  category_id IN (SELECT id FROM public.categories
--                               WHERE user_id = auth.uid())
--   - The SELECT on categories triggers categories_select_authenticated USING,
--     which contains: id IN (SELECT category_id FROM public.shared_categories
--                            WHERE email = auth.jwt()->>'email')
--   - Postgres evaluating shared_categories policies re-enters
--     shared_categories RLS through the categories chain -> 42P17.
--   - Because Postgres evaluates every UPDATE policy together, the cycle
--     also breaks shared_categories_update_invitee even though that policy
--     has no cross-table subquery.
--
-- Fix: replace the raw cross-table subquery on categories with the
-- SECURITY DEFINER function public.user_owns_category(p_category_id, p_user_id).
-- The function bypasses RLS for the narrow ownership check, which is the
-- Supabase-recommended pattern for breaking circular RLS dependencies and
-- matches the existing public.user_owns_bookmark helper introduced in
-- 20251208115323_bookmark_categories_many_to_many.sql.
--
-- categories_select_authenticated is left untouched: its subquery on
-- shared_categories hits shared_categories_select (user_id = auth.uid()
-- OR email = auth.jwt()->>'email'), which has no cross-table reference,
-- so that leg terminates cleanly.
-- ============================================================================

BEGIN;

SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Ownership helper (SECURITY DEFINER, bypasses RLS)
-- ============================================================================
-- SECURITY: the function only answers ownership questions for the calling
-- user (p_user_id must equal auth.uid()). This prevents enumeration of
-- other users' category ownership through the function itself.

CREATE OR REPLACE FUNCTION public.user_owns_category(p_category_id bigint, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = p_category_id AND user_id = p_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_category(bigint, uuid) TO authenticated;

COMMENT ON FUNCTION public.user_owns_category(bigint, uuid) IS
'Checks whether the calling user owns a category. Uses SECURITY DEFINER to bypass RLS and break the shared_categories <-> categories policy cycle that produces Postgres error 42P17. p_user_id must equal auth.uid(), enforced inside the function to prevent cross-user enumeration.';

-- ============================================================================
-- PART 2: Replace the two cycle-inducing shared_categories policies
-- ============================================================================

DROP POLICY IF EXISTS "shared_categories_insert"       ON public.shared_categories;
DROP POLICY IF EXISTS "shared_categories_update_owner" ON public.shared_categories;

-- INSERT: caller must own the category being shared. Using the
-- SECURITY DEFINER helper instead of an inline subquery avoids
-- re-entering categories RLS during WITH CHECK evaluation.
CREATE POLICY "shared_categories_insert"
ON public.shared_categories FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.user_owns_category(category_id, (SELECT auth.uid()))
);

-- UPDATE (owner path): owners may touch their own rows; WITH CHECK
-- re-asserts category ownership via the SECURITY DEFINER helper so
-- a malicious owner cannot redirect the row to a category they
-- don't own (defense in depth, mirrors insert).
CREATE POLICY "shared_categories_update_owner"
ON public.shared_categories FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.user_owns_category(category_id, (SELECT auth.uid()))
);

-- ============================================================================
-- PART 3: Post-migration verification
-- ============================================================================

DO $$
DECLARE
    expected_policies text[] := ARRAY[
        'shared_categories:shared_categories_select',
        'shared_categories:shared_categories_insert',
        'shared_categories:shared_categories_update_owner',
        'shared_categories:shared_categories_update_invitee',
        'shared_categories:shared_categories_delete'
    ];
    missing text;
    cycle_hit record;
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

    -- Confirm the helper function exists and is SECURITY DEFINER.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'user_owns_category'
          AND p.prosecdef = true
    ) THEN
        RAISE EXCEPTION 'public.user_owns_category is missing or not SECURITY DEFINER';
    END IF;

    -- Confirm the two patched policies no longer contain a raw subquery on
    -- public.categories in their with_check predicate. Presence of the
    -- helper function name is the positive signal; absence of the table
    -- reference is the negative signal.
    FOR cycle_hit IN
        SELECT policyname, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'shared_categories'
          AND policyname IN ('shared_categories_insert', 'shared_categories_update_owner')
          AND (with_check ~* 'from\s+(public\.)?categories\b'
               OR with_check !~* 'user_owns_category')
    LOOP
        RAISE EXCEPTION
            'Policy % still references categories directly or missing user_owns_category helper; with_check: %',
            cycle_hit.policyname, cycle_hit.with_check;
    END LOOP;

    RAISE NOTICE 'shared_categories RLS cycle fix verified: user_owns_category helper in place, 42P17 cycle broken';
END $$;

COMMIT;
