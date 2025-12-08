-- ============================================================================
-- MIGRATION: Add composite index for (bookmark_id, user_id)
-- Created: 2024-12-08
-- Purpose: Optimize DELETE in set_bookmark_categories RPC function
-- ============================================================================

BEGIN;

-- 1. Add composite index for RPC delete pattern
-- The set_bookmark_categories function performs:
-- DELETE FROM bookmark_categories WHERE bookmark_id = ? AND user_id = ?
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_bookmark_user
  ON public.bookmark_categories(bookmark_id, user_id);

COMMIT;
