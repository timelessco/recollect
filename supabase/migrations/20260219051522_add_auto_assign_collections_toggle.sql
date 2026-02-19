-- ============================================================================
-- MIGRATION: Auto-assign collections toggle + atomic RPC
-- Created: 2026-02-19
-- Purpose:
--   1. Add auto_assign_collections toggle to profiles table
--   2. Create atomic RPC to replace Uncategorized with matched collections,
--      preventing orphaned bookmarks on partial failure.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- 1. Add toggle column (default true so existing users get the feature)
ALTER TABLE public.profiles
ADD COLUMN auto_assign_collections boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.auto_assign_collections IS
'When true, AI enrichment automatically assigns bookmarks to matching collections.';

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
