-- ============================================================================
-- MIGRATION: Twitter Imports Queue Infrastructure
-- Purpose: Queue-based Twitter/X bookmark processing with atomic transactions
-- Queue name: twitter_imports (sync with src/utils/constants.ts)
-- ============================================================================
--
-- This migration:
--   1. Creates twitter_imports queue via pgmq
--   2. Configures service-role-only RLS (no authenticated access)
--   3. Creates enqueue_twitter_bookmarks RPC (synchronous batch dedup + insert)
--   4. Creates link_twitter_bookmark_category RPC for bookmark-category linking
--   5. Creates status, retry, admin, and cron wrapper functions
--
-- Architecture:
--   - Bookmark creation is synchronous via enqueue_twitter_bookmarks RPC
--   - Queue handles only "link_bookmark_category" messages
--   - Reuses existing generic RPCs: archive_with_reason, update_queue_message_error
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create Queue and Archive Table
-- ============================================================================

SELECT pgmq.create('twitter_imports');

-- ============================================================================
-- PART 2: Configure Queue Permissions and RLS (service-role only)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_twitter_imports') THEN

    ALTER TABLE "pgmq"."q_twitter_imports" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "service-role-only" ON "pgmq"."q_twitter_imports"
      AS RESTRICTIVE FOR ALL TO service_role USING (true);

    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_twitter_imports" TO "service_role";

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_twitter_imports') THEN
      ALTER TABLE "pgmq"."a_twitter_imports" ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "service-role-only" ON "pgmq"."a_twitter_imports"
        AS RESTRICTIVE FOR ALL TO service_role USING (true);

      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_twitter_imports" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Unique index for dedup + Synchronous Batch Bookmark Insert RPC
-- ============================================================================

-- Partial unique index for atomic tweet dedup via ON CONFLICT
-- Only applies to type='tweet' — regular bookmarks allow duplicate URLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_everything_url_user_tweet
  ON public.everything (url, user_id) WHERE type = 'tweet';

CREATE OR REPLACE FUNCTION public.enqueue_twitter_bookmarks(
  p_user_id uuid,
  p_bookmarks jsonb
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
declare
  v_bookmark jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_url text;
  v_title text;
  v_description text;
  v_og_image text;
  v_type text;
  v_meta_data jsonb;
  v_sort_index text;
  v_inserted_at timestamptz;
  v_bookmark_id bigint;
begin
  for v_bookmark in select * from jsonb_array_elements(p_bookmarks)
  loop
    v_url := v_bookmark ->> 'url';

    -- Skip if URL is null or empty
    if v_url is null or btrim(v_url) = '' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Extract fields from JSONB
    v_title := v_bookmark ->> 'title';
    v_description := v_bookmark ->> 'description';
    v_og_image := v_bookmark ->> 'ogImage';
    v_type := coalesce(v_bookmark ->> 'type', 'tweet');
    v_meta_data := coalesce(v_bookmark -> 'meta_data', '{}'::jsonb);
    v_sort_index := v_bookmark ->> 'sort_index';
    v_inserted_at := case
      when v_bookmark ->> 'inserted_at' is not null
      then (v_bookmark ->> 'inserted_at')::timestamptz
      else now()
    end;

    -- Atomic dedup + insert via partial unique index (url, user_id) WHERE type = 'tweet'
    -- trash = NULL (timestamptz column, NULL = not trashed)
    v_bookmark_id := null;
    insert into public.everything (
      url, user_id, type, title, description, "ogImage",
      meta_data, sort_index, trash, inserted_at
    )
    values (
      v_url, p_user_id, v_type, v_title, v_description, v_og_image,
      v_meta_data, v_sort_index, null, v_inserted_at
    )
    on conflict (url, user_id) where type = 'tweet' do nothing
    returning id into v_bookmark_id;

    -- ON CONFLICT DO NOTHING returns NULL id for duplicates
    if v_bookmark_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Assign to uncategorized (0) - categories linked via separate link messages
    insert into public.bookmark_categories (bookmark_id, category_id, user_id)
    values (v_bookmark_id, 0, p_user_id)
    on conflict (bookmark_id, category_id) do nothing;

    -- Queue to ai-embeddings for enrichment
    perform pgmq.send(
      'ai-embeddings',
      jsonb_build_object(
        'id', v_bookmark_id,
        'url', v_url,
        'user_id', p_user_id,
        'type', v_type,
        'title', coalesce(v_title, ''),
        'description', coalesce(v_description, ''),
        'ogImage', v_og_image,
        'meta_data', v_meta_data
      )
    );

    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
end;
$$;

revoke all on function public.enqueue_twitter_bookmarks(uuid, jsonb) from public;
grant execute on function public.enqueue_twitter_bookmarks(uuid, jsonb) to service_role;

comment on function public.enqueue_twitter_bookmarks is
'Synchronous batch Twitter bookmark insert with dedup. Checks for existing tweet bookmarks by URL+user, inserts new ones, and queues to ai-embeddings. Called by sync API route via service role.';

-- ============================================================================
-- PART 4: Bookmark-Category Linking RPC (for "link_bookmark_category" messages)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_twitter_bookmark_category(
  p_url TEXT,
  p_user_id UUID,
  p_category_name TEXT,
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
BEGIN
  -- Step 1: Look up bookmark by URL + type + user
  SELECT id INTO v_bookmark_id
  FROM everything
  WHERE url = p_url
    AND type = 'tweet'
    AND user_id = p_user_id
  LIMIT 1;

  IF v_bookmark_id IS NULL THEN
    -- Bookmark not found yet - RAISE EXCEPTION triggers pgmq retry
    RAISE EXCEPTION 'Bookmark not found for URL: %', p_url;
  END IF;

  -- Step 2: Look up category by case-insensitive name
  SELECT id INTO v_category_id
  FROM categories
  WHERE lower(category_name) = lower(btrim(p_category_name))
    AND user_id = p_user_id
  LIMIT 1;

  IF v_category_id IS NULL THEN
    -- Category should exist from sync-folders call; archive if not
    IF p_msg_id IS NOT NULL THEN
      PERFORM public.archive_with_reason('twitter_imports', p_msg_id, 'category_not_found: ' || p_category_name);
    END IF;

    RETURN jsonb_build_object(
      'bookmark_id', v_bookmark_id,
      'category_id', NULL,
      'reason', 'category_not_found'
    );
  END IF;

  -- Step 3: Upsert into junction table
  INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
  VALUES (v_bookmark_id, v_category_id, p_user_id)
  ON CONFLICT (bookmark_id, category_id) DO NOTHING;

  -- Step 4: Remove uncategorized (0) now that a real category is assigned
  DELETE FROM bookmark_categories
  WHERE bookmark_id = v_bookmark_id
    AND category_id = 0
    AND user_id = p_user_id;

  -- Step 5: Delete queue message atomically
  IF p_msg_id IS NOT NULL THEN
    PERFORM pgmq.delete('twitter_imports', p_msg_id);
  END IF;

  RETURN jsonb_build_object(
    'bookmark_id', v_bookmark_id,
    'category_id', v_category_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'link_twitter_bookmark_category failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.link_twitter_bookmark_category(TEXT, UUID, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_twitter_bookmark_category(TEXT, UUID, TEXT, BIGINT) TO service_role;

COMMENT ON FUNCTION public.link_twitter_bookmark_category IS
'Atomic Twitter bookmark-category linking with queue message deletion. Raises exception if bookmark not found (triggers retry). Called by Edge Function worker.';

-- ============================================================================
-- PART 5: Status, Retry, and Admin Functions
-- ============================================================================

-- 5.1 Get sync status for user
CREATE OR REPLACE FUNCTION public.get_twitter_sync_status(
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
  -- Only allow users to query their own sync status
  IF auth.uid() IS NULL OR auth.uid()::UUID <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view your own sync status';
  END IF;

  SELECT COUNT(*)
  INTO v_pending
  FROM pgmq.q_twitter_imports
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
  FROM pgmq.a_twitter_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  RETURN jsonb_build_object(
    'pending', v_pending,
    'archived', v_archived,
    'archives', v_archives
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_twitter_sync_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_twitter_sync_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_twitter_sync_status(UUID) TO service_role;

COMMENT ON FUNCTION public.get_twitter_sync_status IS
'Get Twitter sync queue status for a user. Returns pending count, archived count, and archive details.';

-- 5.2 Retry specific failed imports
CREATE OR REPLACE FUNCTION public.retry_twitter_import(
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
    FROM pgmq.a_twitter_imports
    WHERE msg_id = ANY(p_msg_ids)
      AND (message->>'user_id')::UUID = p_user_id
  LOOP
    PERFORM pgmq.send(
      'twitter_imports',
      v_msg.message - 'failure_reason' - 'failed_at'
    );

    DELETE FROM pgmq.a_twitter_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_twitter_import(UUID, BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_twitter_import(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_twitter_import(UUID, BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_twitter_import IS
'Retry failed Twitter imports by re-queueing them. Only processes messages owned by the requesting user.';

-- 5.3 Retry ALL archived imports for a user
CREATE OR REPLACE FUNCTION public.retry_all_twitter_imports(
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
    FROM pgmq.a_twitter_imports
    WHERE (message->>'user_id')::UUID = p_user_id
  LOOP
    PERFORM pgmq.send(
      'twitter_imports',
      v_msg.message - 'failure_reason' - 'failed_at'
    );

    DELETE FROM pgmq.a_twitter_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_all_twitter_imports(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_all_twitter_imports(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_all_twitter_imports(UUID) TO service_role;

COMMENT ON FUNCTION public.retry_all_twitter_imports IS
'Retry ALL archived Twitter imports for a user. Re-queues entire archive.';

-- ============================================================================
-- PART 6: Cron Wrapper Functions
-- ============================================================================

-- 6.1 Invoke worker (validates vault secrets, returns request_id)
CREATE OR REPLACE FUNCTION public.invoke_twitter_worker()
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
  FROM vault.decrypted_secrets WHERE name = 'twitter_worker_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret "twitter_worker_url" not found';
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

REVOKE ALL ON FUNCTION public.invoke_twitter_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_twitter_worker() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_twitter_worker() TO service_role;

COMMENT ON FUNCTION public.invoke_twitter_worker IS
'Invokes Twitter import worker. Validates vault secrets exist before making HTTP call.';

-- 6.2 Monitor for recent HTTP failures
CREATE OR REPLACE FUNCTION public.get_twitter_worker_failures(
  p_since_minutes int DEFAULT 5
)
RETURNS TABLE (request_id bigint, status_code int, error_body text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
  SELECT id, status_code, content::text, created
  FROM net._http_response
  WHERE created > NOW() - (p_since_minutes || ' minutes')::interval
    AND (status_code < 200 OR status_code >= 300)
  ORDER BY created DESC;
$$;

REVOKE ALL ON FUNCTION public.get_twitter_worker_failures(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_twitter_worker_failures(int) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_twitter_worker_failures(int) TO service_role;

COMMENT ON FUNCTION public.get_twitter_worker_failures IS
'Returns recent HTTP failures for monitoring. Default: last 5 minutes.';

-- ============================================================================
-- PART 7: Admin Functions (service_role only)
-- ============================================================================

-- 7.1 Get ALL archived imports (across all users)
CREATE OR REPLACE FUNCTION public.admin_get_twitter_archives()
RETURNS TABLE (
  msg_id BIGINT,
  user_id UUID,
  url TEXT,
  failure_reason TEXT,
  archived_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
  SELECT
    msg_id,
    (message->>'user_id')::UUID,
    message->>'url',
    message->>'failure_reason',
    archived_at
  FROM pgmq.a_twitter_imports
  ORDER BY archived_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_twitter_archives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_twitter_archives() TO service_role;

COMMENT ON FUNCTION public.admin_get_twitter_archives IS
'ADMIN: Get all archived Twitter imports across all users. Service role only.';

-- 7.2 Retry ALL archived imports (across all users)
CREATE OR REPLACE FUNCTION public.admin_retry_all_twitter_archives()
RETURNS JSONB
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
    FROM pgmq.a_twitter_imports
  LOOP
    PERFORM pgmq.send(
      'twitter_imports',
      v_msg.message - 'failure_reason' - 'failed_at'
    );

    DELETE FROM pgmq.a_twitter_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_retry_all_twitter_archives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_all_twitter_archives() TO service_role;

COMMENT ON FUNCTION public.admin_retry_all_twitter_archives IS
'ADMIN: Retry ALL archived Twitter imports across all users. Service role only.';

-- 7.3 Retry specific archived imports by msg_id (no user filter)
CREATE OR REPLACE FUNCTION public.admin_retry_twitter_import(
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
    FROM pgmq.a_twitter_imports
    WHERE msg_id = ANY(p_msg_ids)
  LOOP
    PERFORM pgmq.send(
      'twitter_imports',
      v_msg.message - 'failure_reason' - 'failed_at'
    );

    DELETE FROM pgmq.a_twitter_imports WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_retry_twitter_import(BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_twitter_import(BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.admin_retry_twitter_import IS
'ADMIN: Retry specific archived Twitter imports by msg_id. No user filtering. Service role only.';

COMMIT;
