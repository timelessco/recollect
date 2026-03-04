-- ============================================================================
-- MIGRATION: Add ai_summary, image_keywords, and ocr toggles to ai_features_toggle
-- Created: 2026-03-02
-- Purpose:
--   Extend the ai_features_toggle JSONB column with three new keys:
--   - ai_summary (bool): controls AI-generated descriptions
--   - image_keywords (bool): controls AI-generated searchable keywords
--   - ocr (bool): controls OCR text extraction from bookmark images
--   All default to true (enabled) for new and existing users.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- Pre-flight validation
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Migration blocked: public.profiles table does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ai_features_toggle'
      AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'Migration blocked: ai_features_toggle jsonb column does not exist on public.profiles.';
  END IF;
END $$;

-- PART 1: Update column default to include all four toggle keys
ALTER TABLE public.profiles
ALTER COLUMN ai_features_toggle
SET DEFAULT '{"auto_assign_collections": true, "ai_summary": true, "image_keywords": true, "ocr": true}'::jsonb;

-- PART 2: Backfill existing rows — add only missing keys, preserve existing values
-- The || operator lets the right side win on conflicts, so we must guard each key
-- individually to avoid overwriting e.g. {"ai_summary": false} back to true.
UPDATE public.profiles
SET ai_features_toggle = ai_features_toggle
  || CASE WHEN NOT ai_features_toggle ? 'ai_summary' THEN '{"ai_summary": true}'::jsonb ELSE '{}'::jsonb END
  || CASE WHEN NOT ai_features_toggle ? 'image_keywords' THEN '{"image_keywords": true}'::jsonb ELSE '{}'::jsonb END
  || CASE WHEN NOT ai_features_toggle ? 'ocr' THEN '{"ocr": true}'::jsonb ELSE '{}'::jsonb END
WHERE NOT (ai_features_toggle ? 'ai_summary' AND ai_features_toggle ? 'image_keywords' AND ai_features_toggle ? 'ocr');

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
  WHERE NOT (ai_features_toggle ? 'ai_summary' AND ai_features_toggle ? 'image_keywords' AND ai_features_toggle ? 'ocr');

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % rows still missing ai_summary, image_keywords, or ocr keys', missing_count;
  END IF;
END;
$$;

COMMIT;
