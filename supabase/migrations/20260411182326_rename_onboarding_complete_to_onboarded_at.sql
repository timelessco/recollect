-- ============================================================================
-- Migration: Rename profiles.onboarding_complete to onboarded_at
-- ============================================================================
-- Purpose:
--   Replace the boolean onboarding_complete flag with a nullable timestamptz
--   onboarded_at column. NULL means the user has not yet completed onboarding
--   (welcome modal should mount); a non-NULL value records when they first
--   dismissed the flow.
--
-- Affected:
--   - public.profiles (drop column: onboarding_complete, add column: onboarded_at)
--
-- Background:
--   The previous migration (20260408120000) added onboarding_complete as
--   `boolean NOT NULL DEFAULT false` and backfilled every existing row to
--   true, which hid the welcome modal from all UAT users. Sandeep confirmed
--   on 2026-04-10 that every user should see the modal on their next login,
--   so the new column is left NULL for all rows. Switching to a timestamp
--   also preserves first-completion history for future cohort re-targeting
--   instead of collapsing it into a one-bit flag.
--
-- Strategy:
--   1. Add onboarded_at as a nullable TIMESTAMPTZ (no default → every row NULL)
--   2. Drop the old onboarding_complete boolean column
--
-- UAT only. Safe because the feature has not yet shipped to production, so
-- this is a cheap rename rather than a 3-step expand-migrate-contract.
-- ============================================================================

BEGIN;

-- Add the replacement column. Nullable with no default so every existing row
-- lands at NULL, which is the signal both the SSR gate and the auth callback
-- redirect use to mount the welcome modal.
ALTER TABLE public.profiles
  ADD COLUMN onboarded_at TIMESTAMPTZ;

-- Drop the old boolean. No data to preserve — the only meaningful value was
-- "true = already onboarded", which we are intentionally resetting so every
-- UAT user re-sees the modal once after this migration lands.
ALTER TABLE public.profiles
  DROP COLUMN onboarding_complete;

COMMIT;
