-- ============================================================================
-- Migration: Update Instagram imports to maintain profiles.category_order
-- ============================================================================
-- This migration updates process_instagram_bookmark to track newly created
-- categories and append them to profiles.category_order, matching the
-- behavior of Twitter and Raindrop imports.
--
-- Changes:
--   1. Track newly created category IDs in v_new_category_ids array
--   2. After junction table management, append new categories to category_order
--   3. Use advisory lock to prevent race conditions on profile updates
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.process_instagram_bookmark(
  p_url TEXT,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_og_image TEXT DEFAULT NULL,
  p_meta_data JSONB DEFAULT '{}'::JSONB,
  p_collection_names TEXT[] DEFAULT '{}'::TEXT[],
  p_msg_id BIGINT DEFAULT NULL,
  p_saved_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookmark_id BIGINT;
  v_category_id BIGINT;
  v_category_ids BIGINT[] := '{}'::BIGINT[];
  v_new_category_ids BIGINT[] := '{}'::BIGINT[];
  v_collection_name TEXT;
  v_slug TEXT;
  v_current_order BIGINT[];
BEGIN
  -- Validate URL early (fail fast)
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'URL cannot be null or empty';
  END IF;

  -- Step 1: Get or create categories
  IF p_collection_names IS NOT NULL AND array_length(p_collection_names, 1) > 0 THEN
    FOREACH v_collection_name IN ARRAY p_collection_names
    LOOP
      IF v_collection_name IS NOT NULL AND btrim(v_collection_name) != '' THEN
        PERFORM pg_advisory_xact_lock(
          hashtext(p_user_id::text || btrim(v_collection_name))
        );

        SELECT id INTO v_category_id
        FROM categories
        WHERE category_name = btrim(v_collection_name)
          AND user_id = p_user_id
        LIMIT 1;

        IF v_category_id IS NULL THEN
          v_slug := lower(regexp_replace(btrim(v_collection_name), '[^a-zA-Z0-9]+', '-', 'g'))
                    || '-instagram-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

          INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
          VALUES (btrim(v_collection_name), v_slug, p_user_id, 'bookmark', '#ffffff')
          RETURNING id INTO v_category_id;

          -- Track newly created category
          v_new_category_ids := array_append(v_new_category_ids, v_category_id);
        END IF;

        v_category_ids := array_append(v_category_ids, v_category_id);
      END IF;
    END LOOP;
  END IF;

  -- Step 2: Insert bookmark into 'everything' table
  INSERT INTO everything (url, user_id, type, title, description, "ogImage", meta_data, trash, inserted_at)
  VALUES (p_url, p_user_id, p_type, p_title, p_description, p_og_image, p_meta_data, NULL, COALESCE(p_saved_at, NOW()))
  RETURNING id INTO v_bookmark_id;

  -- Step 3: Manage junction table (exclusive model)
  IF array_length(v_category_ids, 1) > 0 THEN
    DELETE FROM bookmark_categories
    WHERE bookmark_id = v_bookmark_id
      AND category_id = 0
      AND user_id = p_user_id;

    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    SELECT v_bookmark_id, unnest(v_category_ids), p_user_id
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  ELSE
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, 0, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;

  -- Step 3.5: Update profile category_order for newly created categories
  IF array_length(v_new_category_ids, 1) > 0 THEN
    -- Serialize category_order updates per user
    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || 'category_order')
    );

    SELECT category_order INTO v_current_order
    FROM profiles
    WHERE id = p_user_id;

    -- Append new categories to order (batch append)
    -- Note: v_new_category_ids only contains IDs of categories just created,
    -- so they cannot already be in the order array
    UPDATE profiles
    SET category_order = COALESCE(v_current_order, '{}'::bigint[]) || v_new_category_ids
    WHERE id = p_user_id;
  END IF;

  -- Step 4: Delete queue message atomically (inside transaction)
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('instagram_imports', p_msg_id);
  END IF;

  -- Step 5: Queue to ai-embeddings for enrichment
  PERFORM pgmq.send(
    'ai-embeddings',
    jsonb_build_object(
      'id', v_bookmark_id,
      'url', p_url,
      'user_id', p_user_id,
      'type', p_type,
      'title', COALESCE(p_title, ''),
      'description', COALESCE(p_description, ''),
      'ogImage', p_og_image,
      'meta_data', p_meta_data
    )
  );

  RETURN jsonb_build_object(
    'bookmark_id', v_bookmark_id,
    'category_ids', v_category_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_instagram_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Preserve existing grants
REVOKE ALL ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.process_instagram_bookmark IS
'Atomic Instagram bookmark processing with queue message deletion and AI enrichment queueing. Called by Edge Function worker. Updated to maintain profiles.category_order for newly created categories.';

COMMIT;
