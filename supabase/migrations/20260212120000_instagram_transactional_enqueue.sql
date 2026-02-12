-- ============================================================================
-- MIGRATION: Instagram Transactional Enqueue
-- Purpose: Align Instagram imports with Twitter/Raindrop pattern -
--          synchronous dedup + insert via RPC, returning {inserted, skipped}
-- ============================================================================
--
-- This migration:
--   1. Drops old process_instagram_bookmark (signature changes)
--   2. Creates enqueue_instagram_bookmarks RPC (synchronous batch dedup + insert)
--   3. Creates new process_instagram_bookmark RPC (category linking + enrichment)
--   4. Creates partial unique index for Instagram dedup (outside transaction)
--
-- Architecture change:
--   BEFORE: API -> pgmq.send_batch() -> Worker does INSERT + categories + ai-embeddings
--   AFTER:  API -> enqueue_instagram_bookmarks RPC (dedup + INSERT + enqueue)
--           -> Worker handles category linking + ai-embeddings only
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop old process_instagram_bookmark
-- ============================================================================
-- Must drop because parameter types change completely:
--   OLD: (TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ)
--   NEW: (BIGINT, UUID, TEXT[], BIGINT)
-- Only the Edge Function calls this, safe to replace.

DROP FUNCTION IF EXISTS public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ);

-- ============================================================================
-- PART 2: Partial Unique Index for Instagram Dedup
-- ============================================================================
-- Must be created BEFORE the function that uses ON CONFLICT with this index.
-- Non-concurrent (inside transaction) to guarantee atomicity with the function.
-- Follows Twitter pattern: idx_everything_url_user_tweet (url, user_id) WHERE type = 'tweet'

CREATE UNIQUE INDEX IF NOT EXISTS idx_everything_url_user_instagram
  ON public.everything (url, user_id) WHERE type = 'instagram';

-- ============================================================================
-- PART 3: Synchronous Batch Bookmark Insert RPC
-- ============================================================================
-- Modeled on enqueue_twitter_bookmarks (20260206120000_twitter_imports_queue.sql)
-- Loops through bookmarks, dedup via partial unique index, insert, assign
-- uncategorized, and queue to instagram_imports for async processing.

CREATE OR REPLACE FUNCTION public.enqueue_instagram_bookmarks(
  p_user_id uuid,
  p_bookmarks jsonb
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookmark jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_url text;
  v_title text;
  v_description text;
  v_og_image text;
  v_meta_data jsonb;
  v_saved_at timestamptz;
  v_collection_names jsonb;
  v_bookmark_id bigint;
BEGIN
  FOR v_bookmark IN SELECT * FROM jsonb_array_elements(p_bookmarks)
  LOOP
    v_url := v_bookmark ->> 'url';

    -- Skip if URL is null or empty
    IF v_url IS NULL OR BTRIM(v_url) = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Extract fields from JSONB
    v_title := v_bookmark ->> 'title';
    v_description := v_bookmark ->> 'description';
    v_og_image := v_bookmark ->> 'ogImage';
    v_meta_data := COALESCE(v_bookmark -> 'meta_data', '{}'::jsonb);
    v_saved_at := CASE
      WHEN v_bookmark ->> 'saved_at' IS NOT NULL
      THEN (v_bookmark ->> 'saved_at')::timestamptz
      ELSE NOW()
    END;
    -- Extract collection_names from meta_data for queue message
    v_collection_names := COALESCE(v_meta_data -> 'saved_collection_names', '[]'::jsonb);

    -- Atomic dedup + insert via partial unique index
    -- (url, user_id) WHERE type = 'instagram'
    -- trash = NULL (timestamptz column, NULL = not trashed)
    v_bookmark_id := NULL;
    INSERT INTO public.everything (
      url, user_id, type, title, description, "ogImage",
      meta_data, trash, inserted_at
    )
    VALUES (
      v_url, p_user_id, 'instagram', v_title, v_description, v_og_image,
      v_meta_data, NULL, v_saved_at
    )
    ON CONFLICT (url, user_id) WHERE type = 'instagram' DO NOTHING
    RETURNING id INTO v_bookmark_id;

    -- ON CONFLICT DO NOTHING returns NULL id for duplicates
    IF v_bookmark_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Assign to uncategorized (0) - categories linked by worker
    INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, 0, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;

    -- Queue to instagram_imports for category linking + AI enrichment
    PERFORM pgmq.send(
      'instagram_imports',
      jsonb_build_object(
        'type', 'enrich_bookmark',
        'id', v_bookmark_id,
        'url', v_url,
        'user_id', p_user_id,
        'title', COALESCE(v_title, ''),
        'description', COALESCE(v_description, ''),
        'ogImage', v_og_image,
        'meta_data', v_meta_data,
        'collection_names', v_collection_names
      )
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_instagram_bookmarks(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_instagram_bookmarks(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.enqueue_instagram_bookmarks IS
'Synchronous batch Instagram bookmark insert with dedup. Checks for existing Instagram bookmarks by URL+user via partial unique index, inserts new ones, assigns uncategorized, and queues to instagram_imports for category linking + AI enrichment. Called by sync API route via service role.';

-- ============================================================================
-- PART 4: New process_instagram_bookmark RPC (category linking + enrichment)
-- ============================================================================
-- Modeled on process_raindrop_bookmark (20260206050200_raindrop_imports_queue.sql)
-- Bookmark already inserted by enqueue RPC. This function handles:
--   1. Category get/create from collection_names
--   2. Junction table management
--   3. Profile category_order update
--   4. Queue message deletion
--   5. AI enrichment queueing

CREATE OR REPLACE FUNCTION public.process_instagram_bookmark(
  p_bookmark_id BIGINT,
  p_user_id UUID,
  p_collection_names TEXT[] DEFAULT '{}'::TEXT[],
  p_msg_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookmark_url TEXT;
  v_bookmark_title TEXT;
  v_bookmark_description TEXT;
  v_bookmark_og_image TEXT;
  v_bookmark_meta_data JSONB;
  v_category_id BIGINT;
  v_category_ids BIGINT[] := '{}'::BIGINT[];
  v_collection_name TEXT;
  v_slug TEXT;
  v_new_category BOOLEAN := false;
  v_current_order BIGINT[];
BEGIN
  -- Step 1: Get the bookmark (already inserted by enqueue RPC)
  SELECT url, title, description, "ogImage", meta_data
  INTO v_bookmark_url, v_bookmark_title, v_bookmark_description, v_bookmark_og_image, v_bookmark_meta_data
  FROM everything
  WHERE id = p_bookmark_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    -- Bookmark was deleted between enqueue and processing
    IF p_msg_id IS NOT NULL THEN
      PERFORM pgmq.delete('instagram_imports', p_msg_id);
    END IF;
    RETURN jsonb_build_object('status', 'not_found', 'bookmark_id', p_bookmark_id);
  END IF;

  -- Step 2: Get or create categories from collection_names
  IF p_collection_names IS NOT NULL AND array_length(p_collection_names, 1) > 0 THEN
    FOREACH v_collection_name IN ARRAY p_collection_names
    LOOP
      IF v_collection_name IS NOT NULL AND btrim(v_collection_name) != '' THEN
        -- Serialize category creation per user+name combo (prevents duplicates under concurrent load)
        PERFORM pg_advisory_xact_lock(
          hashtext(p_user_id::text || btrim(v_collection_name))
        );

        -- Try to find existing category by name
        SELECT id INTO v_category_id
        FROM categories
        WHERE category_name = btrim(v_collection_name)
          AND user_id = p_user_id
        LIMIT 1;

        -- Create if not found
        IF v_category_id IS NULL THEN
          v_slug := lower(regexp_replace(btrim(v_collection_name), '[^a-zA-Z0-9]+', '-', 'g'))
                    || '-instagram-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

          INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
          VALUES (btrim(v_collection_name), v_slug, p_user_id, 'bookmark', '#ffffff')
          RETURNING id INTO v_category_id;

          v_new_category := true;
        END IF;

        v_category_ids := array_append(v_category_ids, v_category_id);
      END IF;
    END LOOP;
  END IF;

  -- Step 3: Manage junction table
  IF array_length(v_category_ids, 1) > 0 THEN
    -- Remove uncategorized (0) now that real categories are assigned
    DELETE FROM bookmark_categories
    WHERE bookmark_id = p_bookmark_id
      AND category_id = 0
      AND user_id = p_user_id;

    -- Insert category associations using unnest() for efficiency
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    SELECT p_bookmark_id, unnest(v_category_ids), p_user_id
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;
  -- If no collection_names, bookmark stays at uncategorized (0) from enqueue

  -- Step 4: Update profile category_order if new categories were created
  IF v_new_category THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || 'category_order')
    );

    SELECT category_order INTO v_current_order
    FROM profiles
    WHERE id = p_user_id;

    -- Append any new category IDs not already in the order
    FOR i IN 1..array_length(v_category_ids, 1)
    LOOP
      IF v_current_order IS NULL OR NOT (v_category_ids[i] = ANY(v_current_order)) THEN
        v_current_order := COALESCE(v_current_order, '{}'::bigint[]) || v_category_ids[i];
      END IF;
    END LOOP;

    UPDATE profiles
    SET category_order = v_current_order
    WHERE id = p_user_id;
  END IF;

  -- Step 5: Delete queue message atomically (inside transaction)
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('instagram_imports', p_msg_id);
  END IF;

  -- Step 6: Queue to ai-embeddings for AI enrichment
  PERFORM pgmq.send(
    'ai-embeddings',
    jsonb_build_object(
      'id', p_bookmark_id,
      'url', v_bookmark_url,
      'user_id', p_user_id,
      'type', 'instagram',
      'title', COALESCE(v_bookmark_title, ''),
      'description', COALESCE(v_bookmark_description, ''),
      'ogImage', v_bookmark_og_image,
      'meta_data', COALESCE(v_bookmark_meta_data, '{}'::jsonb)
    )
  );

  RETURN jsonb_build_object(
    'status', 'processed',
    'bookmark_id', p_bookmark_id,
    'category_ids', v_category_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_instagram_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.process_instagram_bookmark(BIGINT, UUID, TEXT[], BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_instagram_bookmark(BIGINT, UUID, TEXT[], BIGINT) TO service_role;

COMMENT ON FUNCTION public.process_instagram_bookmark IS
'Atomic Instagram bookmark enrichment: category get/create, junction entries, category_order update, queue message deletion, ai-embeddings enqueue. Bookmark already inserted by enqueue_instagram_bookmarks. Called by Edge Function worker.';

COMMIT;
