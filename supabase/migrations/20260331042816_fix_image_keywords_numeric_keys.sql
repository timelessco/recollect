-- ============================================================================
-- Migration: Fix image_keywords numeric-keyed features
-- ============================================================================
-- Purpose:
--   The 20260324 migration converted legacy array image_keywords into
--   { "features": { "0": "kw1", "1": "kw2" } } with numeric index keys.
--   This migration:
--     1. Converts those numeric-keyed features into a proper
--        additional_keywords array
--     2. Converts any remaining legacy arrays directly into
--        { "features": { "additional_keywords": [...] } }
-- ============================================================================

BEGIN;

-- Step 1: Fix numeric-keyed features → additional_keywords array
-- { "features": { "0": "red", "1": "car" } }
-- → { "features": { "additional_keywords": ["red", "car"] } }
--
-- Detects numeric keys by checking if the first key is '0' or '1'.
-- Extracts all values in key order into an additional_keywords array,
-- then removes the numeric keys.
UPDATE public.everything
SET meta_data = jsonb_set(
    meta_data,
    '{image_keywords,features}',
    (
        -- Preserve non-numeric keys, excluding additional_keywords (merged below)
        SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
        FROM jsonb_each(meta_data->'image_keywords'->'features') AS t(key, value)
        WHERE key !~ '^\d+$' AND key != 'additional_keywords'
    ) || jsonb_build_object(
        'additional_keywords',
        -- Merge any pre-existing additional_keywords with the numeric-keyed values
        COALESCE(meta_data->'image_keywords'->'features'->'additional_keywords', '[]'::jsonb)
        || (
            SELECT jsonb_agg(value ORDER BY key::int)
            FROM jsonb_each_text(meta_data->'image_keywords'->'features') AS t(key, value)
            WHERE key ~ '^\d+$'
        )
    )
)
WHERE meta_data->'image_keywords'->'features' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords'->'features') = 'object'
  AND EXISTS (
      SELECT 1
      FROM jsonb_object_keys(meta_data->'image_keywords'->'features') AS k
      WHERE k ~ '^\d+$'
  );

-- Step 2: Convert any remaining legacy arrays directly
-- ["red", "car"] → { "features": { "additional_keywords": ["red", "car"] } }
UPDATE public.everything
SET meta_data = jsonb_set(
    meta_data,
    '{image_keywords}',
    jsonb_build_object(
        'features',
        jsonb_build_object('additional_keywords', meta_data->'image_keywords')
    )
)
WHERE meta_data->'image_keywords' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords') = 'array';

COMMIT;
