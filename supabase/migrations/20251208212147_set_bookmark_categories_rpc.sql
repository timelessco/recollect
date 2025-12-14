-- ============================================================================
-- MIGRATION: Create set_bookmark_categories RPC function
-- Created: 2024-12-08
-- Purpose: Atomic delete + insert for bookmark categories (transaction-safe)
-- ============================================================================

BEGIN;

-- 1. Create atomic function to replace bookmark categories
CREATE OR REPLACE FUNCTION public.set_bookmark_categories(
  p_bookmark_id bigint,
  p_category_ids bigint[]
)
RETURNS SETOF public.bookmark_categories
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_category_ids bigint[];
BEGIN
  -- Always include category 0 (Uncategorized) as base category
  -- This ensures every bookmark always has at least the default category
  v_category_ids := array_append(p_category_ids, 0::bigint);
  -- Remove duplicates
  v_category_ids := ARRAY(SELECT DISTINCT unnest(v_category_ids));

  -- Delete existing entries for this bookmark/user
  DELETE FROM public.bookmark_categories
  WHERE bookmark_id = p_bookmark_id AND user_id = v_user_id;

  -- Insert new entries (always includes 0) and return them
  RETURN QUERY
  INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id)
  SELECT p_bookmark_id, unnest(v_category_ids), v_user_id
  RETURNING *;
END;
$$;

-- 2. Set permissions (only authenticated users can call)
REVOKE EXECUTE ON FUNCTION public.set_bookmark_categories(bigint, bigint[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_bookmark_categories(bigint, bigint[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_bookmark_categories(bigint, bigint[]) TO authenticated;

-- 3. Documentation
COMMENT ON FUNCTION public.set_bookmark_categories IS
'Atomically replaces all category associations for a bookmark. Deletes existing entries and inserts new ones in a single transaction. Uses auth.uid() for security - user cannot spoof their ID.';

COMMIT;
