-- ============================================================================
-- MIGRATION: Create atomic create_and_assign_tag RPC function
-- Created: 2025-12-31
-- Purpose: Atomically create a tag and assign it to a bookmark in a single transaction
-- ============================================================================
--
-- This migration:
--   1. Creates create_and_assign_tag RPC with FOR UPDATE locking
--   2. Verifies bookmark ownership before creating tag (prevents orphaned tags)
--   3. Returns both created records for client-side cache updates
--
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- Atomic function to create a tag and assign it to a bookmark
-- Unlike set_bookmark_categories which only modifies junction tables,
-- this function creates a NEW entity (tag) before the junction insert.
-- Therefore, we MUST verify ownership in the RPC to prevent orphaned tags
-- if the bookmark_tags insert fails.
CREATE OR REPLACE FUNCTION public.create_and_assign_tag(
  p_bookmark_id bigint,
  p_tag_name text
)
RETURNS TABLE(
  tag_id bigint,
  tag_name text,
  tag_user_id uuid,
  tag_created_at timestamptz,
  bookmark_tag_id bigint,
  bookmark_tag_bookmark_id bigint,
  bookmark_tag_tag_id bigint,
  bookmark_tag_user_id uuid,
  bookmark_tag_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_tag_record record;
  v_bookmark_tag_record record;
BEGIN
  -- Step 1: Verify bookmark ownership with FOR UPDATE lock
  -- This is critical: we must verify BEFORE creating the tag to prevent orphaned tags
  PERFORM 1 FROM public.everything
  WHERE id = p_bookmark_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bookmark not found or not owned by user'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Step 2: Insert tag (will fail on duplicate name via unique constraint)
  INSERT INTO public.tags (name, user_id)
  VALUES (p_tag_name, v_user_id)
  RETURNING * INTO v_tag_record;

  -- Step 3: Insert bookmark_tag junction
  INSERT INTO public.bookmark_tags (bookmark_id, tag_id, user_id)
  VALUES (p_bookmark_id, v_tag_record.id, v_user_id)
  RETURNING * INTO v_bookmark_tag_record;

  -- Return both records as a flat row
  RETURN QUERY SELECT
    v_tag_record.id,
    v_tag_record.name,
    v_tag_record.user_id,
    v_tag_record.created_at,
    v_bookmark_tag_record.id,
    v_bookmark_tag_record.bookmark_id,
    v_bookmark_tag_record.tag_id,
    v_bookmark_tag_record.user_id,
    v_bookmark_tag_record.created_at;
END;
$$;

-- Permissions: Only authenticated users can call this function
REVOKE EXECUTE ON FUNCTION public.create_and_assign_tag(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_and_assign_tag(bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_and_assign_tag(bigint, text) TO authenticated;

COMMENT ON FUNCTION public.create_and_assign_tag IS
'Atomically creates a tag and assigns it to a bookmark in a single transaction. Uses FOR UPDATE locking to prevent race conditions. Verifies bookmark ownership before creating tag to prevent orphaned tags. Both operations succeed or both fail.';

COMMIT;
