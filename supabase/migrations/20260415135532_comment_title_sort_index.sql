-- ============================================================================
-- MIGRATION: Document everything_idx_title_description as load-bearing
-- Created: 2026-04-15
-- Purpose:
--   * Attach a consumer map to `everything_idx_title_description` so the
--     next agent inspecting the index (via `\d+ everything`, `pg_indexes`,
--     or Supabase Studio) sees inline why it cannot be dropped.
--   * Earlier today this index was slated for removal as "orphaned after
--     the 1-arg search_bookmarks(varchar) drop". EXPLAIN ANALYZE on dev
--     proved the planner still uses it as the ordered-access path for
--     paginated `ORDER BY title` in fetch-bookmarks-data and
--     fetch-public-category-bookmarks (v1 + v2). The comment captures
--     that evidence on the DB object itself, not just in migration
--     history.
-- ============================================================================

COMMENT ON INDEX public.everything_idx_title_description IS
  'Load-bearing: serves ORDER BY title ASC/DESC for paginated bookmark fetches '
  'in fetch-bookmarks-data and fetch-public-category-bookmarks (v1 + v2), '
  'triggered when sortValue is alphabetical-sort-ascending or -descending. '
  'Leading-column btree(title, description). Do not drop without EXPLAIN '
  'evidence that no alphabetical-sort page query uses it.';
