BEGIN;


-- ============================================================================
-- PART 1: Update ogImage for audio bookmarks
-- ============================================================================

-- Set ogImage to the new audio-fallback.png for all audio bookmarks.
UPDATE public.everything
SET "ogImage" = 'https://app.recollect.so/audio-icon.svg'
WHERE type LIKE 'audio/%';

-- ============================================================================
-- Post-migration verification
-- ============================================================================

DO $
DECLARE
  remaining_count integer;
BEGIN
  SELECT count(*) INTO remaining_count
  FROM public.everything
  WHERE type LIKE 'audio/%'
    AND "ogImage" != 'https://app.recollect.so/audio-icon.svg';

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % audio bookmarks do not have audio-icon.svg ogImage', remaining_count;
  END IF;

  RAISE NOTICE 'Migration verified: all audio bookmarks updated to audio-icon.svg successfully.';
END $;

COMMIT;
