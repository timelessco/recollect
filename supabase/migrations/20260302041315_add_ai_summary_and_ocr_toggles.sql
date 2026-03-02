-- ============================================================================
-- MIGRATION: Add ai_summary and ocr toggles to ai_features_toggle
-- Created: 2026-03-02
-- Purpose:
--   Extend the ai_features_toggle JSONB column with two new keys:
--   - ai_summary (bool): controls AI-generated descriptions and keywords
--   - ocr (bool): controls OCR text extraction from bookmark images
--   Both default to true (enabled) for new and existing users.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- PART 1: Update column default to include all three toggle keys
ALTER TABLE public.profiles
ALTER COLUMN ai_features_toggle
SET DEFAULT '{"auto_assign_collections": true, "ai_summary": true, "ocr": true}'::jsonb;

-- PART 2: Backfill existing rows — merge new keys without overwriting existing values
UPDATE public.profiles
SET ai_features_toggle = ai_features_toggle || '{"ai_summary": true, "ocr": true}'::jsonb
WHERE NOT (ai_features_toggle ? 'ai_summary' AND ai_features_toggle ? 'ocr');

-- PART 3: Update column comment
COMMENT ON COLUMN public.profiles.ai_features_toggle IS
'Per-user AI feature toggles. Keys: auto_assign_collections (bool), ai_summary (bool), ocr (bool).';

-- Post-migration verification
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM public.profiles
  WHERE NOT (ai_features_toggle ? 'ai_summary' AND ai_features_toggle ? 'ocr');

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % rows still missing ai_summary or ocr keys', missing_count;
  END IF;
END;
$$;

COMMIT;
