-- ============================================================================
-- Migration: Normalize content type names in image_keywords
-- ============================================================================
-- Purpose:
--   Update meta_data.image_keywords.type arrays to use joined lowercase format.
--   Replaces 4 legacy values:
--     "developer tools" → "developertools"
--     "social media"    → "socialmedia"
--     "research_paper"  → "researchpaper"
--     "music_album"     → "musicalbum"
-- ============================================================================

BEGIN;

-- Replace old type values in the image_keywords.type JSONB array
UPDATE public.everything
SET meta_data = jsonb_set(
  meta_data,
  '{image_keywords,type}',
  (
    SELECT jsonb_agg(
      CASE val
        WHEN 'developer tools' THEN '"developertools"'::jsonb
        WHEN 'social media'    THEN '"socialmedia"'::jsonb
        WHEN 'research_paper'  THEN '"researchpaper"'::jsonb
        WHEN 'music_album'     THEN '"musicalbum"'::jsonb
        ELSE to_jsonb(val)
      END
    )
    FROM jsonb_array_elements_text(meta_data->'image_keywords'->'type') AS val
  )
)
WHERE meta_data->'image_keywords'->'type' IS NOT NULL
  AND (
    meta_data->'image_keywords'->'type' @> '"developer tools"'::jsonb
    OR meta_data->'image_keywords'->'type' @> '"social media"'::jsonb
    OR meta_data->'image_keywords'->'type' @> '"research_paper"'::jsonb
    OR meta_data->'image_keywords'->'type' @> '"music_album"'::jsonb
  );

-- Verification: ensure no old values remain
DO $$
DECLARE
  v_remaining bigint;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.everything
  WHERE meta_data->'image_keywords'->'type' IS NOT NULL
    AND (
      meta_data->'image_keywords'->'type' @> '"developer tools"'::jsonb
      OR meta_data->'image_keywords'->'type' @> '"social media"'::jsonb
      OR meta_data->'image_keywords'->'type' @> '"research_paper"'::jsonb
      OR meta_data->'image_keywords'->'type' @> '"music_album"'::jsonb
    );

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Migration failed: % bookmarks still have old type values', v_remaining;
  END IF;

  RAISE NOTICE 'Verification passed: no legacy type values remain';
END $$;

COMMIT;
