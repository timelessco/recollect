-- ============================================================================
-- Migration: Drop profiles.display_name CHECK constraint
-- ============================================================================
-- Purpose:
--   The `profiles_display_name_check` constraint enforced
--   `length(display_name) < 100 AND display_name ~ '^[a-zA-Z0-9\s]+$'`.
--   Identical content + length rules now live in the application layer:
--     - settings form: react-hook-form `pattern` + `maxLength`
--     - v2 update-user-profile: Zod `trim().min(1).max(100).regex(...)`
--
--   Direct PostgREST writes are scoped to the row owner by the per-op
--   profiles RLS policies, so a caller cannot bypass the application layer
--   to mutate another user's display_name. Render-time HTML escaping in
--   the email modules keeps content malformed by a user via the API safe
--   for downstream rendering.
--
--   The DB CHECK is therefore a Postgres POSIX mirror of a JS regex
--   enforced upstream — duplication that can drift, with no extra defense.
--   Drop it.
--
--   No data backfill is required: every existing row already satisfied the
--   stricter old rule and trivially satisfies "no constraint".
-- ============================================================================

BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_check;

COMMIT;
