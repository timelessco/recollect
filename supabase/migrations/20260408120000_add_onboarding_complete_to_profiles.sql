-- Adds onboarding_complete to profiles.
-- New signups default to false (onboarding pending).
-- Existing rows are backfilled to true so pre-existing users
-- are treated as already onboarded.

ALTER TABLE public.profiles
  ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET onboarding_complete = true;
