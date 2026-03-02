-- ============================================================================
-- MIGRATION: Add image_keywords toggle to ai_features_toggle
-- Created: 2026-03-02
-- Purpose:
--   Extend the ai_features_toggle JSONB column with a new key:
--   - image_keywords (bool): controls AI-generated searchable keywords
--   Previously bundled with ai_summary, now independently toggleable.
--   Defaults to true (enabled) for new and existing users.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- PART 1: Update column default to include image_keywords
ALTER TABLE public.profiles
ALTER COLUMN ai_features_toggle
SET DEFAULT '{"auto_assign_collections": true, "ai_summary": true, "image_keywords": true, "ocr": true}'::jsonb;

-- PART 2: Backfill existing rows — merge new key without overwriting existing values
UPDATE public.profiles
SET ai_features_toggle = ai_features_toggle || '{"image_keywords": true}'::jsonb
WHERE NOT (ai_features_toggle ? 'image_keywords');

-- PART 3: Update column comment
COMMENT ON COLUMN public.profiles.ai_features_toggle IS
'Per-user AI feature toggles. Keys: auto_assign_collections (bool), ai_summary (bool), image_keywords (bool), ocr (bool).';

-- Post-migration verification
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM public.profiles
  WHERE NOT (ai_features_toggle ? 'image_keywords');

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % rows still missing image_keywords key', missing_count;
  END IF;
END;
$$;

COMMIT;
