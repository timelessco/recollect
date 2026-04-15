-- ============================================================================
-- MIGRATION: Drop dead search overloads and unused order_index
-- Created: 2026-04-15
-- Purpose:
--   * Remove dead schema left over after the everything.category_id drop on
--     2026-04-14. All objects below have zero callers across web, extension,
--     iOS SwiftUI, and React Native.
-- Notes:
--   * `search_bookmarks(text, text, text[], uuid)` and
--     `search_bookmarks_url_scope(character, character varying)` are dev-only
--     schema drift — never added to local migrations. Both bodies reference
--     nonexistent parameters or mismatched column lists and would error at
--     runtime. Listing them here documents the cleanup even though the local
--     DROPs are no-ops; `IF EXISTS` keeps local resets green.
--   * `search_bookmarks_debug(text)` exists in local migrations. Closes #932.
--   * `categories.order_index` has zero non-null rows on local and dev.
--     Superseded by `profiles.category_order[]`, which holds the live ordering.
--     Declared in nine hand-edited schema/supplement files but read by no
--     code path in any consumer.
--   * The live junction-based `search_bookmarks_url_tag_scope` is untouched.
--   * `everything_idx_title_description` (btree on title, description) is
--     KEPT. Although it's no longer referenced by search RPCs, EXPLAIN on dev
--     confirms the planner picks it for paginated `ORDER BY title`
--     ASC/DESC from fetch-bookmarks-data and fetch-public-category-bookmarks
--     (v1 + v2). Dropping it would force a sort of the filtered bookmark set
--     on every alphabetical-sort page load.
-- ============================================================================

DROP FUNCTION IF EXISTS public.search_bookmarks(text, text, text[], uuid);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_scope(character, character varying);
DROP FUNCTION IF EXISTS public.search_bookmarks_debug(text);

ALTER TABLE public.categories DROP COLUMN IF EXISTS order_index;
