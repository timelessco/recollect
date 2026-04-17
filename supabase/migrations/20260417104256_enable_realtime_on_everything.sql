-- ============================================================================
-- MIGRATION: Enable Supabase Realtime on public.everything
-- Created: 2026-04-17
-- Purpose: Add `public.everything` to the `supabase_realtime` publication so
--          authenticated clients can subscribe to row-level UPDATE/DELETE
--          events for bookmarks they can already SELECT via RLS.
--
--          Consumed by the client-side "live screenshot" flow: when a user
--          adds a bookmark, the dashboard opens a `postgres_changes` channel
--          filtered by the new row's id and splices fresh data into React
--          Query cache as the server-side enrichment pipeline writes
--          `meta_data.screenshot` and, later, the final `ogImage` + blurhash.
-- ============================================================================
--
-- RLS posture:
--   The existing `user_access_own_bookmarks` policy on `public.everything`
--   (from 20251208115323_bookmark_categories_many_to_many.sql) gates SELECT on
--   `user_id = auth.uid()` plus collaborator/owner checks via the
--   `bookmark_categories` junction. Realtime runs the SELECT policy against
--   the post-UPDATE row in the WAL worker — the existing policy is already
--   Realtime-compatible. No policy changes in this migration.
--
-- REPLICA IDENTITY:
--   Left at DEFAULT (primary key). The client only reads `payload.new`, not
--   `payload.old`, so FULL replica identity would add WAL volume without
--   changing behavior.
-- ============================================================================

BEGIN;

SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Add public.everything to the supabase_realtime publication
-- ============================================================================
-- `ALTER PUBLICATION` is not tracked by `supabase db diff` (per
-- .claude/rules/supabase-schema.md), so this lives as a versioned migration.

ALTER PUBLICATION supabase_realtime ADD TABLE public.everything;

-- ============================================================================
-- PART 2: Post-migration verification
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'everything';

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'Expected public.everything in supabase_realtime publication, found % rows', v_count;
    END IF;
END $$;

COMMIT;
