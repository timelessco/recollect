-- ============================================================================
-- MIGRATION: AI features toggle + atomic auto-assign collections RPC
-- Created: 2026-02-19
-- Purpose:
--   1. Add ai_features_toggle JSONB column to profiles for per-feature toggles
--   2. Create atomic RPC to replace Uncategorized with matched collections,
--      preventing orphaned bookmarks on partial failure.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- 1. Add JSONB column for AI feature toggles (empty object = all defaults)
ALTER TABLE public.profiles
ADD COLUMN ai_features_toggle jsonb NOT NULL DEFAULT '{"auto_assign_collections": true}'::jsonb;

COMMENT ON COLUMN public.profiles.ai_features_toggle IS
'Per-user AI feature toggles. Keys: auto_assign_collections (bool).';

-- 2. Atomic function to replace Uncategorized with matched collections
CREATE OR REPLACE FUNCTION public.auto_assign_collections(
  p_bookmark_id bigint,
  p_user_id uuid,
  p_category_ids bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Guard: only proceed if bookmark currently has only category 0 (Uncategorized)
  IF NOT (
    SELECT count(*) = 1
      AND bool_and(category_id = 0)
    FROM public.bookmark_categories
    WHERE bookmark_id = p_bookmark_id
      AND user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  -- Insert matched collections
  INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id)
  SELECT p_bookmark_id, unnest(p_category_ids), p_user_id;

  -- Remove the Uncategorized entry
  DELETE FROM public.bookmark_categories
  WHERE bookmark_id = p_bookmark_id
    AND user_id = p_user_id
    AND category_id = 0;
END;
$$;

-- Only the service role should call this function (server-side AI enrichment)
REVOKE EXECUTE ON FUNCTION public.auto_assign_collections(bigint, uuid, bigint[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_assign_collections(bigint, uuid, bigint[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_assign_collections(bigint, uuid, bigint[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_collections(bigint, uuid, bigint[]) TO service_role;

COMMENT ON FUNCTION public.auto_assign_collections IS
'Atomically replaces the Uncategorized (id=0) entry with matched collection IDs for a bookmark. '
'Guards against already-categorized bookmarks. Both insert and delete succeed or both fail.';

COMMIT;
