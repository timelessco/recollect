-- ============================================================================
-- Migration: Fix Instagram import function - change trash from false to NULL
-- ============================================================================
-- After converting trash column to timestamp, the function still uses false (boolean).
-- This fixes the type mismatch by changing false -> NULL in the INSERT statement
-- within the CREATE OR REPLACE FUNCTION below.
-- Note: CREATE OR REPLACE FUNCTION requires the full function body.
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
        END IF;

          v_category_ids := array_append(v_category_ids, v_category_id);
      END IF;
    END LOOP;
  END IF;

  -- Step 2: Insert bookmark into 'everything' table
  -- FIX: Changed trash from false to NULL (trash column is now timestamp, not boolean)
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
'Atomic Instagram bookmark processing with queue message deletion and AI enrichment queueing. Called by Edge Function worker. Updated to use NULL for trash column (timestamp type).';

-- ============================================================================
-- PART 2: Add RPC to store last error in queue message
-- ============================================================================
-- When RPC fails, we store the error in the message so that when max_retries
-- is exceeded, we can see the actual error instead of just "max_retries_exceeded"

CREATE OR REPLACE FUNCTION public.update_queue_message_error(
  p_queue_name TEXT,
  p_msg_id BIGINT,
  p_error TEXT
) RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
BEGIN
  EXECUTE format(
    'UPDATE pgmq.%I SET message = message || $1 WHERE msg_id = $2',
    'q_' || p_queue_name
  ) USING jsonb_build_object('last_error', p_error, 'last_error_at', now()), p_msg_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_queue_message_error(TEXT, BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_queue_message_error(TEXT, BIGINT, TEXT) TO service_role;

COMMENT ON FUNCTION public.update_queue_message_error IS
'Store last error in queue message for debugging. Called by Edge Function when RPC fails.';

-- ============================================================================
-- PART 3: Cron Wrapper Functions
-- ============================================================================

-- 3.1 Invoke worker (validates vault secrets, returns request_id)
CREATE OR REPLACE FUNCTION public.invoke_instagram_worker()
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
  FROM vault.decrypted_secrets WHERE name = 'instagram_worker_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret "instagram_worker_url" not found';
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

REVOKE ALL ON FUNCTION public.invoke_instagram_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_instagram_worker() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_instagram_worker() TO service_role;

COMMENT ON FUNCTION public.invoke_instagram_worker IS
'Invokes Instagram import worker. Validates vault secrets exist before making HTTP call.';

-- 3.2 Monitor for recent HTTP failures
CREATE OR REPLACE FUNCTION public.get_instagram_worker_failures(
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

REVOKE ALL ON FUNCTION public.get_instagram_worker_failures(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_instagram_worker_failures(int) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_instagram_worker_failures(int) TO service_role;

COMMENT ON FUNCTION public.get_instagram_worker_failures IS
'Returns recent HTTP failures for monitoring. Default: last 5 minutes.';

COMMIT;
