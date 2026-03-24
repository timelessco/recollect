-- ============================================================================
-- MIGRATION: Chrome Bookmark Imports Queue Infrastructure
-- Purpose: Queue-based Chrome bookmark processing with atomic transactions
-- Queue name: chrome_bookmark_imports (sync with src/utils/constants.ts)
-- ============================================================================
--
-- This migration:
--   1. Creates chrome_bookmark_imports queue via pgmq
--   2. Configures service-role-only RLS (no authenticated access)
--   3. Creates enqueue_chrome_bookmarks RPC (batch insert + enqueue)
--   4. Creates process_chrome_bookmark RPC (atomic enrichment)
--   5. Creates status, retry, and cron wrapper functions
--
-- Modeled on enqueue_raindrop_bookmarks (20260206050200_raindrop_imports_queue.sql)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create Queue and Archive Table
-- ============================================================================

SELECT pgmq.create('chrome_bookmark_imports');

-- ============================================================================
-- PART 2: Configure Queue Permissions and RLS (service-role only)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_chrome_bookmark_imports') THEN

    ALTER TABLE "pgmq"."q_chrome_bookmark_imports" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "service-role-only" ON "pgmq"."q_chrome_bookmark_imports"
      AS RESTRICTIVE FOR ALL TO service_role USING (true);

    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
      ON TABLE "pgmq"."q_chrome_bookmark_imports" TO "service_role";

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_chrome_bookmark_imports') THEN
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
        ON TABLE "pgmq"."a_chrome_bookmark_imports" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Batch Insert + Enqueue RPC
-- ============================================================================
-- Called by the API route to atomically insert bookmarks and enqueue them.
-- Performs URL-level dedup (same URL for this user, regardless of source).
-- Bookmarks appear immediately in UI as uncategorized; queue handles enrichment.

CREATE OR REPLACE FUNCTION public.enqueue_chrome_bookmarks(
  p_user_id UUID,
  p_bookmarks JSONB  -- array of {url, title, description, ogImage, category_name, inserted_at}
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_bookmark JSONB;
  v_bookmark_id BIGINT;
  v_url TEXT;
  v_title TEXT;
  v_description TEXT;
  v_og_image TEXT;
  v_category_name TEXT;
  v_inserted_at TIMESTAMP WITH TIME ZONE;
  v_exists BOOLEAN;
  v_inserted INT := 0;
  v_skipped INT := 0;
BEGIN
  -- Validate input
  IF p_bookmarks IS NULL OR jsonb_array_length(p_bookmarks) = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'skipped', 0);
  END IF;

  FOR v_bookmark IN SELECT * FROM jsonb_array_elements(p_bookmarks)
  LOOP
    v_url := v_bookmark->>'url';
    v_title := v_bookmark->>'title';
    v_description := v_bookmark->>'description';
    v_og_image := v_bookmark->>'ogImage';
    v_category_name := v_bookmark->>'category_name';
    v_inserted_at := CASE
      WHEN v_bookmark->>'inserted_at' IS NULL OR v_bookmark->>'inserted_at' = ''
      THEN NULL
      ELSE (v_bookmark->>'inserted_at')::TIMESTAMP WITH TIME ZONE
    END;

    -- Skip if URL is empty
    IF v_url IS NULL OR btrim(v_url) = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Skip if URL is empty
    IF v_url IS NULL OR btrim(v_url) = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || '|' || lower(btrim(v_url)))
    );

    -- URL-level dedup: check if this URL already exists for this user (any source)
    SELECT EXISTS(
      SELECT 1 FROM everything
      WHERE url = v_url
        AND user_id = p_user_id
    ) INTO v_exists;

    IF v_exists THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert bookmark with minimal data (enrichment happens in queue)
    INSERT INTO everything (url, user_id, title, description, "ogImage", type, meta_data, trash, inserted_at)
    VALUES (
      v_url,
      p_user_id,
      v_title,
      v_description,
      v_og_image,
      'bookmark',
      jsonb_build_object(
        'is_chrome_bookmark', true,
        'chrome_folder_name', v_category_name
      ),
      NULL,
      COALESCE(v_inserted_at, NOW())
    )
    RETURNING id INTO v_bookmark_id;

    -- Enqueue for processing
    PERFORM pgmq.send(
      'chrome_bookmark_imports',
      jsonb_build_object(
        'bookmark_id', v_bookmark_id,
        'url', v_url,
        'ogImage', v_og_image,
        'chrome_folder_name', v_category_name,
        'user_id', p_user_id::text,
        'inserted_at', CASE WHEN v_inserted_at IS NULL THEN NULL ELSE v_inserted_at::text END
      )
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'enqueue_chrome_bookmarks failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_chrome_bookmarks(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_chrome_bookmarks(UUID, JSONB) TO service_role;

COMMENT ON FUNCTION public.enqueue_chrome_bookmarks IS
'Atomic batch insert of Chrome bookmarks + enqueue for enrichment. Called by API route.';

-- ============================================================================
-- PART 4: Atomic Bookmark Processing RPC
-- ============================================================================
-- Called by the Edge Function after sanitization (favicon, ogImage, mediaType).
-- Handles: category get/create, URL+category dedup, junction entries,
-- category_order update, queue message deletion, ai-embeddings enqueue.

CREATE OR REPLACE FUNCTION public.process_chrome_bookmark(
  p_bookmark_id BIGINT,
  p_user_id UUID,
  p_category_name TEXT DEFAULT NULL,
  p_favicon TEXT DEFAULT NULL,
  p_og_image TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_msg_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_category_id BIGINT;
  v_slug TEXT;
  v_existing_id BIGINT;
  v_bookmark_url TEXT;
  v_current_meta JSONB;
  v_current_order BIGINT[];
  v_new_category BOOLEAN := false;
BEGIN
  -- Get the bookmark URL and current meta_data
  SELECT url, meta_data INTO v_bookmark_url, v_current_meta
  FROM everything
  WHERE id = p_bookmark_id AND user_id = p_user_id;

  IF v_bookmark_url IS NULL THEN
    -- Bookmark was deleted between enqueue and processing
    IF p_msg_id IS NOT NULL THEN
      PERFORM pgmq.delete('chrome_bookmark_imports', p_msg_id);
    END IF;
    RETURN jsonb_build_object('status', 'not_found', 'bookmark_id', p_bookmark_id);
  END IF;

  -- Step 1: Get or create category
  IF p_category_name IS NOT NULL AND btrim(p_category_name) != '' THEN
    -- Serialize category creation per user+name combo (prevents duplicates under concurrent load)
    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || btrim(p_category_name))
    );

    -- Try to find existing category by name
    SELECT id INTO v_category_id
    FROM categories
    WHERE category_name = btrim(p_category_name)
      AND user_id = p_user_id
    LIMIT 1;

    -- Create if not found
    IF v_category_id IS NULL THEN
      v_slug := lower(regexp_replace(btrim(p_category_name), '[^a-zA-Z0-9]+', '-', 'g'))
                || '-chrome-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

      INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
      VALUES (btrim(p_category_name), v_slug, p_user_id, 'google-chrome', '#ffffff')
      RETURNING id INTO v_category_id;

      v_new_category := true;
    END IF;
  ELSE
    -- Uncategorized
    v_category_id := 0;
  END IF;

  -- Step 2: Full URL+category dedup (another bookmark with same URL in same category)
  IF v_category_id > 0 THEN
    SELECT e.id INTO v_existing_id
    FROM everything e
    JOIN bookmark_categories bc ON bc.bookmark_id = e.id
    WHERE e.url = v_bookmark_url
      AND e.user_id = p_user_id
      AND bc.category_id = v_category_id
      AND e.id != p_bookmark_id
    LIMIT 1;
  ELSE
    -- For uncategorized, check if another bookmark with same URL has no junction entry
    SELECT e.id INTO v_existing_id
    FROM everything e
    LEFT JOIN bookmark_categories bc ON bc.bookmark_id = e.id
    WHERE e.url = v_bookmark_url
      AND e.user_id = p_user_id
      AND bc.bookmark_id IS NULL
      AND e.id != p_bookmark_id
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Duplicate: delete pre-inserted bookmark
    DELETE FROM bookmark_categories WHERE bookmark_id = p_bookmark_id AND user_id = p_user_id;
    DELETE FROM everything WHERE id = p_bookmark_id AND user_id = p_user_id;

    -- Archive queue message with reason
    IF p_msg_id IS NOT NULL THEN
      PERFORM public.archive_with_reason('chrome_bookmark_imports', p_msg_id, 'duplicate_url_category');
    END IF;

    RETURN jsonb_build_object('status', 'duplicate', 'bookmark_id', p_bookmark_id, 'existing_id', v_existing_id);
  END IF;

  -- Step 3: Update bookmark with sanitized data
  UPDATE everything
  SET
    "ogImage" = p_og_image,
    inserted_at = COALESCE(p_inserted_at, inserted_at),
    meta_data = COALESCE(v_current_meta, '{}'::jsonb) || jsonb_build_object(
      'favIcon', p_favicon,
      'mediaType', p_media_type,
      'is_chrome_bookmark', true
    )
  WHERE id = p_bookmark_id AND user_id = p_user_id;

  -- Step 4: Manage junction table — insert category assignment
  IF v_category_id > 0 THEN
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (p_bookmark_id, v_category_id, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;

  -- Step 5: Update profile category_order if new category was created
  IF v_new_category THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_user_id::text || 'category_order')
    );

    SELECT category_order INTO v_current_order
    FROM profiles
    WHERE id = p_user_id;

    IF v_current_order IS NULL OR NOT (v_category_id = ANY(v_current_order)) THEN
      UPDATE profiles
      SET category_order = COALESCE(v_current_order, '{}'::bigint[]) || v_category_id
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- Step 6: Delete queue message atomically (inside transaction)
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('chrome_bookmark_imports', p_msg_id);
  END IF;

  -- Step 7: Queue to ai-embeddings for enrichment
  PERFORM pgmq.send(
    'ai-embeddings',
    jsonb_build_object(
      'id', p_bookmark_id,
      'url', v_bookmark_url,
      'user_id', p_user_id,
      'type', 'bookmark',
      'title', COALESCE((SELECT title FROM everything WHERE id = p_bookmark_id), ''),
      'description', COALESCE((SELECT description FROM everything WHERE id = p_bookmark_id), ''),
      'ogImage', p_og_image,
      'meta_data', COALESCE(v_current_meta, '{}'::jsonb) || jsonb_build_object(
        'favIcon', p_favicon,
        'mediaType', p_media_type,
        'is_chrome_bookmark', true
      )
    )
  );

  RETURN jsonb_build_object(
    'status', 'processed',
    'bookmark_id', p_bookmark_id,
    'category_id', v_category_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_chrome_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.process_chrome_bookmark(BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_chrome_bookmark(BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, BIGINT) TO service_role;

COMMENT ON FUNCTION public.process_chrome_bookmark IS
'Atomic Chrome bookmark enrichment: category get/create, dedup, sanitized data update, junction entries, ai-embeddings enqueue. Called by Edge Function worker.';

-- ============================================================================
-- PART 5: Status and Retry Functions
-- ============================================================================

-- 5.1 Get sync status for user
CREATE OR REPLACE FUNCTION public.get_chrome_bookmark_sync_status(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_pending BIGINT;
  v_archived BIGINT;
  v_archives JSONB;
BEGIN
  SELECT COUNT(*)
  INTO v_pending
  FROM pgmq.q_chrome_bookmark_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  SELECT
    COUNT(*),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'msg_id', msg_id,
        'url', message->>'url',
        'failure_reason', message->>'failure_reason',
        'archived_at', archived_at
      )
    ), '[]'::jsonb)
  INTO v_archived, v_archives
  FROM pgmq.a_chrome_bookmark_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  RETURN jsonb_build_object(
    'pending', v_pending,
    'archived', v_archived,
    'archives', v_archives
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_chrome_bookmark_sync_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chrome_bookmark_sync_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chrome_bookmark_sync_status(UUID) TO service_role;

COMMENT ON FUNCTION public.get_chrome_bookmark_sync_status IS
'Get Chrome bookmark sync queue status for a user. Returns pending count, archived count, and archive details.';

-- 5.2 Retry specific archived imports
CREATE OR REPLACE FUNCTION public.retry_chrome_bookmark_import(
  p_user_id UUID,
  p_msg_ids BIGINT[]
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_msg RECORD;
  v_requeued INT := 0;
BEGIN
  FOR v_msg IN
    SELECT msg_id, message
    FROM pgmq.a_chrome_bookmark_imports
    WHERE msg_id = ANY(p_msg_ids)
      AND (message->>'user_id')::UUID = p_user_id
  LOOP
    PERFORM pgmq.send(
      'chrome_bookmark_imports',
      v_msg.message - 'failure_reason' - 'failed_at' - 'last_error' - 'last_error_at'
    );

    DELETE FROM pgmq.a_chrome_bookmark_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_chrome_bookmark_import(UUID, BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_chrome_bookmark_import(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_chrome_bookmark_import(UUID, BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_chrome_bookmark_import IS
'Retry failed Chrome bookmark imports by re-queueing them. Only processes messages owned by the requesting user.';

-- 5.3 Retry ALL archived imports for a user
CREATE OR REPLACE FUNCTION public.retry_all_chrome_bookmark_imports(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_msg RECORD;
  v_requeued INT := 0;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only retry your own archives';
  END IF;

  FOR v_msg IN
    SELECT msg_id, message
    FROM pgmq.a_chrome_bookmark_imports
    WHERE (message->>'user_id')::UUID = p_user_id
  LOOP
    PERFORM pgmq.send(
      'chrome_bookmark_imports',
      v_msg.message - 'failure_reason' - 'failed_at' - 'last_error' - 'last_error_at'
    );

    DELETE FROM pgmq.a_chrome_bookmark_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_all_chrome_bookmark_imports(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_all_chrome_bookmark_imports(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_all_chrome_bookmark_imports(UUID) TO service_role;

COMMENT ON FUNCTION public.retry_all_chrome_bookmark_imports IS
'Retry ALL archived Chrome bookmark imports for a user. Re-queues entire archive.';

-- ============================================================================
-- PART 6: Cron Wrapper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_chrome_bookmark_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, pg_temp
AS $$
DECLARE
  v_request_id bigint;
  v_url text;
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'chrome_bookmark_worker_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret "chrome_bookmark_worker_url" not found';
  END IF;

  IF v_service_key IS NULL THEN
    RAISE EXCEPTION 'Vault secret "supabase_service_role_key" not found';
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_chrome_bookmark_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_chrome_bookmark_worker() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_chrome_bookmark_worker() TO service_role;

COMMENT ON FUNCTION public.invoke_chrome_bookmark_worker IS
'Invokes Chrome bookmark import worker. Validates vault secrets exist before making HTTP call.';

COMMIT;

-- ============================================================================
-- NOTE: Vault secrets and cron job are configured in seed.sql (LOCAL ONLY)
-- Required secrets: chrome_bookmark_worker_url, supabase_service_role_key
-- Required cron: process-chrome-bookmark-imports (10 seconds)
-- See bottom of supabase/seed.sql for setup.
-- ============================================================================
