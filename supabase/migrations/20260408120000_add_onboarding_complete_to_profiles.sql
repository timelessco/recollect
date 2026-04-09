-- Add onboarding_complete flag to profiles.
-- New signups start with false so they see the welcome modal on first login.
-- Existing rows are backfilled to true so current users don't get nagged
-- with a setup wizard on their next login after this ships.
--
-- Both statements run in the same transaction — no window where existing
-- users briefly have false.

ALTER TABLE public.profiles
  ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET onboarding_complete = true;
