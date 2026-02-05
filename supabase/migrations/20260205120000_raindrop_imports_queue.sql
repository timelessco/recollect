-- ============================================================================
-- MIGRATION: Raindrop Imports Queue Infrastructure
-- Purpose: Queue-based Raindrop bookmark processing with atomic transactions
-- Queue name: raindrop_imports (sync with src/utils/constants.ts)
-- ============================================================================
--
-- This migration:
--   1. Creates raindrop_imports queue via pgmq
--   2. Configures service-role-only RLS (no authenticated access)
--   3. Creates process_raindrop_bookmark RPC with atomic message deletion
--   4. Creates agent-native endpoints (status, retry)
--   5. Creates cron wrapper function for worker invocation
--
-- Reused from instagram_imports (already generic):
--   - archive_with_reason(p_queue_name, p_msg_id, p_reason)
--   - update_queue_message_error(p_queue_name, p_msg_id, p_error)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create Queue and Archive Table
-- ============================================================================

SELECT pgmq.create('raindrop_imports');

-- ============================================================================
-- PART 2: Configure Queue Permissions and RLS (service-role only)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_raindrop_imports') THEN

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_raindrop_imports" ENABLE ROW LEVEL SECURITY;

    -- Create restrictive policy - only service_role can access
    CREATE POLICY "service-role-only" ON "pgmq"."q_raindrop_imports"
      AS RESTRICTIVE FOR ALL TO service_role USING (true);

    -- Grant permissions for queue tables (service_role only)
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_raindrop_imports" TO "service_role";

    -- Configure archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_raindrop_imports') THEN
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_raindrop_imports" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create Atomic Bookmark Processing RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_raindrop_bookmark(
  p_url TEXT,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_og_image TEXT DEFAULT NULL,
  p_meta_data JSONB DEFAULT '{}'::JSONB,
  p_category_name TEXT DEFAULT NULL,
  p_msg_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookmark_id BIGINT;
  v_category_id BIGINT;
  v_slug TEXT;
BEGIN
  -- Validate URL early (fail fast)
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'URL cannot be null or empty';
  END IF;

  -- Step 1: Get or create category
  IF p_category_name IS NOT NULL AND btrim(p_category_name) != '' AND btrim(p_category_name) != 'Unsorted' THEN
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

    -- Create if not found (safety net - categories are pre-created by API)
    IF v_category_id IS NULL THEN
      -- Generate unique slug following Raindrop pattern: slugify-rain_drop-{uniqid}
      v_slug := lower(regexp_replace(btrim(p_category_name), '[^a-zA-Z0-9]+', '-', 'g'))
                || '-rain_drop-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

      INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
      VALUES (btrim(p_category_name), v_slug, p_user_id, 'droplets-02', '#ffffff')
      RETURNING id INTO v_category_id;
    END IF;
  END IF;

  -- Step 2: Insert bookmark into 'everything' table
  INSERT INTO everything (url, user_id, type, title, description, "ogImage", meta_data, trash)
  VALUES (p_url, p_user_id, p_type, p_title, p_description, p_og_image, p_meta_data, NULL)
  RETURNING id INTO v_bookmark_id;

  -- Step 3: Manage junction table
  IF v_category_id IS NOT NULL THEN
    -- Remove uncategorized (0) when adding real category
    DELETE FROM bookmark_categories
    WHERE bookmark_id = v_bookmark_id
      AND category_id = 0
      AND user_id = p_user_id;

    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, v_category_id, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  ELSE
    -- No category: assign to uncategorized (0)
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, 0, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;

  -- Step 4: Delete queue message atomically (inside transaction)
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('raindrop_imports', p_msg_id);
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
    'category_id', v_category_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_raindrop_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Only service_role can call (worker uses service role)
REVOKE ALL ON FUNCTION public.process_raindrop_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_raindrop_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, BIGINT) TO service_role;

COMMENT ON FUNCTION public.process_raindrop_bookmark IS
'Atomic Raindrop bookmark processing with queue message deletion and AI enrichment queueing. Called by Edge Function worker.';

-- ============================================================================
-- PART 4: Agent-Native Endpoints
-- ============================================================================

-- 4.1 Get sync status for user
CREATE OR REPLACE FUNCTION public.get_raindrop_sync_status(
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
  FROM pgmq.q_raindrop_imports
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
  FROM pgmq.a_raindrop_imports
  WHERE (message->>'user_id')::UUID = p_user_id
    AND message->>'failure_reason' IS NOT NULL;

  RETURN jsonb_build_object(
    'pending', v_pending,
    'failed', v_failed,
    'failures', v_failures
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_raindrop_sync_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_raindrop_sync_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_raindrop_sync_status(UUID) TO service_role;

COMMENT ON FUNCTION public.get_raindrop_sync_status IS
'Get Raindrop sync queue status for a user. Returns pending count, failed count, and failure details.';

-- 4.2 Retry failed imports
CREATE OR REPLACE FUNCTION public.retry_raindrop_import(
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
    FROM pgmq.a_raindrop_imports
    WHERE msg_id = ANY(p_msg_ids)
      AND (message->>'user_id')::UUID = p_user_id
  LOOP
    -- Re-queue the message (without failure metadata)
    PERFORM pgmq.send(
      'raindrop_imports',
      v_msg.message - 'failure_reason' - 'failed_at' - 'last_error' - 'last_error_at'
    );

    -- Delete from archive
    DELETE FROM pgmq.a_raindrop_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_raindrop_import(UUID, BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_raindrop_import(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_raindrop_import(UUID, BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_raindrop_import IS
'Retry failed Raindrop imports by re-queueing them. Only processes messages owned by the requesting user.';

-- ============================================================================
-- PART 5: Cron Wrapper Function
-- ============================================================================

-- Invoke worker (validates vault secrets, returns request_id)
CREATE OR REPLACE FUNCTION public.invoke_raindrop_worker()
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
  FROM vault.decrypted_secrets WHERE name = 'raindrop_worker_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret "raindrop_worker_url" not found';
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

REVOKE ALL ON FUNCTION public.invoke_raindrop_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_raindrop_worker() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_raindrop_worker() TO service_role;

COMMENT ON FUNCTION public.invoke_raindrop_worker IS
'Invokes Raindrop import worker. Validates vault secrets exist before making HTTP call.';

-- ============================================================================
-- PART 6: Vault Secrets + pg_cron (Local Development)
-- ============================================================================
-- These are DML operations not tracked by schema diff.
-- Production values must be set manually post-deployment.

-- Store Edge Function URL for local Docker network
SELECT vault.create_secret(
  'http://api.supabase.internal:8000/functions/v1/process-raindrop-imports',
  'raindrop_worker_url'
);

-- supabase_service_role_key is shared across all workers
-- Only create if not already present (Instagram migration may have created it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') THEN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      'supabase_service_role_key'
    );
  END IF;
END $$;

-- Create pg_cron job (10 second interval for local dev)
SELECT cron.schedule(
  'process-raindrop-imports',
  '10 seconds',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'raindrop_worker_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

COMMIT;
