-- ============================================================================
-- MIGRATION: Instagram Imports Queue Infrastructure
-- Purpose: Queue-based Instagram bookmark processing with atomic transactions
-- Queue name: instagram_imports (sync with src/utils/constants.ts)
-- ============================================================================
--
-- This migration:
--   1. Creates instagram_imports queue via pgmq
--   2. Configures service-role-only RLS (no authenticated access)
--   3. Creates process_instagram_bookmark RPC with atomic message deletion
--   4. Creates agent-native endpoints (archive_with_reason, status, retry)
--   5. Adds composite index for category lookups
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create Queue and Archive Table
-- ============================================================================

SELECT pgmq.create('instagram_imports');

-- ============================================================================
-- PART 2: Configure Queue Permissions and RLS (service-role only)
-- ============================================================================

DO $$
BEGIN
  -- Only configure if the queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_instagram_imports') THEN

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_instagram_imports" ENABLE ROW LEVEL SECURITY;

    -- Create restrictive policy - only service_role can access
    -- (No authenticated user should have direct queue access)
    CREATE POLICY "service-role-only" ON "pgmq"."q_instagram_imports"
      AS RESTRICTIVE FOR ALL TO service_role USING (true);

    -- Grant permissions for queue tables (service_role only)
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_instagram_imports" TO "service_role";

    -- Configure archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_instagram_imports') THEN
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_instagram_imports" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create Atomic Bookmark Processing RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_instagram_bookmark(
  p_url TEXT,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_og_image TEXT DEFAULT NULL,
  p_meta_data JSONB DEFAULT '{}'::JSONB,
  p_collection_names TEXT[] DEFAULT '{}'::TEXT[],
  p_msg_id BIGINT DEFAULT NULL,  -- Queue message ID for atomic delete
  p_saved_at TIMESTAMPTZ DEFAULT NULL  -- Instagram's original save timestamp for ordering
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
  v_collection_name TEXT;
  v_slug TEXT;
BEGIN
  -- Validate URL early (fail fast)
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'URL cannot be null or empty';
  END IF;

  -- Step 1: Get or create categories
  IF p_collection_names IS NOT NULL AND array_length(p_collection_names, 1) > 0 THEN
    FOREACH v_collection_name IN ARRAY p_collection_names
    LOOP
      -- Skip empty names
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
          -- Generate unique slug following existing patterns:
          -- Twitter: slugify-{uniqid}-twitter
          -- Raindrop: slugify-rain_drop-{uniqid}
          -- Instagram: slugify-instagram-{random8}
          v_slug := lower(regexp_replace(btrim(v_collection_name), '[^a-zA-Z0-9]+', '-', 'g'))
                    || '-instagram-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

          INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
          VALUES (btrim(v_collection_name), v_slug, p_user_id, 'bookmark', '#ffffff')
          RETURNING id INTO v_category_id;
        END IF;

        v_category_ids := array_append(v_category_ids, v_category_id);
      END IF;
    END LOOP;
  END IF;

  -- Step 2: Insert bookmark into 'everything' table
  -- Note: No upsert - same URL can exist in different collections (by design)
  INSERT INTO everything (url, user_id, type, title, description, "ogImage", meta_data, trash, inserted_at)
  VALUES (p_url, p_user_id, p_type, p_title, p_description, p_og_image, p_meta_data, false, COALESCE(p_saved_at, NOW()))
  RETURNING id INTO v_bookmark_id;

  -- Step 3: Manage junction table (exclusive model)
  IF array_length(v_category_ids, 1) > 0 THEN
    -- Remove uncategorized (0) when adding real categories
    DELETE FROM bookmark_categories
    WHERE bookmark_id = v_bookmark_id
      AND category_id = 0
      AND user_id = p_user_id;

    -- Insert category associations using unnest() for efficiency
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    SELECT v_bookmark_id, unnest(v_category_ids), p_user_id
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  ELSE
    -- No categories: assign to uncategorized (0)
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, 0, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;

  -- Step 4: Delete queue message atomically (inside transaction)
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('instagram_imports', p_msg_id);
  END IF;

  RETURN jsonb_build_object(
    'bookmark_id', v_bookmark_id,
    'category_ids', v_category_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging (appears in Postgres logs)
    RAISE WARNING 'process_instagram_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Re-raise to trigger rollback
    RAISE;
END;
$$;

-- Only service_role can call (worker uses service role)
REVOKE ALL ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], BIGINT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.process_instagram_bookmark IS
'Atomic Instagram bookmark processing with queue message deletion. Called by Edge Function worker.';

-- ============================================================================
-- PART 4: Agent-Native Endpoints
-- ============================================================================

-- 4.1 Archive with reason (for failure tracking)
CREATE OR REPLACE FUNCTION public.archive_with_reason(
  p_queue_name TEXT,
  p_msg_id BIGINT,
  p_reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
BEGIN
  -- Archive the message first
  PERFORM pgmq.archive(p_queue_name, p_msg_id);

  -- Update the archived message with failure metadata
  -- Use schema.%I to properly quote only the table name
  EXECUTE format(
    'UPDATE pgmq.%I SET message = message || $1 WHERE msg_id = $2',
    'a_' || p_queue_name
  ) USING jsonb_build_object('failure_reason', p_reason, 'failed_at', now()::text), p_msg_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'archive_with_reason failed: %', SQLERRM;
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_with_reason(TEXT, BIGINT, TEXT) TO service_role;

COMMENT ON FUNCTION public.archive_with_reason IS
'Archive a queue message with a failure reason. Used by Edge Function for failed imports.';

-- 4.2 Get sync status for user
CREATE OR REPLACE FUNCTION public.get_instagram_sync_status(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
  v_pending BIGINT;
  v_failed BIGINT;
  v_failures JSONB;
BEGIN
  -- Count pending messages for this user
  SELECT COUNT(*)
  INTO v_pending
  FROM pgmq.q_instagram_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  -- Count and get failed messages for this user
  SELECT
    COUNT(*),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'msg_id', msg_id,
        'url', message->>'url',
        'failure_reason', message->>'failure_reason',
        'failed_at', message->>'failed_at'
      )
    ), '[]'::jsonb)
  INTO v_failed, v_failures
  FROM pgmq.a_instagram_imports
  WHERE (message->>'user_id')::UUID = p_user_id
    AND message->>'failure_reason' IS NOT NULL;

  RETURN jsonb_build_object(
    'pending', v_pending,
    'failed', v_failed,
    'failures', v_failures
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_instagram_sync_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_instagram_sync_status(UUID) TO service_role;

COMMENT ON FUNCTION public.get_instagram_sync_status IS
'Get Instagram sync queue status for a user. Returns pending count, failed count, and failure details.';

-- 4.3 Retry failed imports
CREATE OR REPLACE FUNCTION public.retry_instagram_import(
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
    FROM pgmq.a_instagram_imports
    WHERE msg_id = ANY(p_msg_ids)
      AND (message->>'user_id')::UUID = p_user_id
  LOOP
    -- Re-queue the message (without failure metadata)
    PERFORM pgmq.send(
      'instagram_imports',
      v_msg.message - 'failure_reason' - 'failed_at'
    );

    -- Delete from archive
    DELETE FROM pgmq.a_instagram_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.retry_instagram_import(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_instagram_import(UUID, BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_instagram_import IS
'Retry failed Instagram imports by re-queueing them. Only processes messages owned by the requesting user.';

COMMIT;

-- ============================================================================
-- PART 5: Composite Index (outside transaction for CONCURRENTLY)
-- ============================================================================

-- This improves performance of the category lookup in the FOREACH loop above
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_user
ON categories (category_name, user_id);
