-- ============================================================================
-- Migration: Instagram Queue Admin Functions
-- ============================================================================
-- Adds retry-all capability and admin functions for queue management:
-- 1. Fix get_instagram_sync_status to show ALL archived (not just failures)
-- 2. Add retry_all_instagram_imports for user-level retry all
-- 3. Add admin functions for cross-user queue management (service_role only)
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Fix Status Query (show ALL archived, not just failures)
-- ============================================================================

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
  v_archived BIGINT;
  v_archives JSONB;
BEGIN
  -- Count pending messages for this user
  SELECT COUNT(*)
  INTO v_pending
  FROM pgmq.q_instagram_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  -- Count and get ALL archived messages for this user (not just failures)
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
  FROM pgmq.a_instagram_imports
  WHERE (message->>'user_id')::UUID = p_user_id;

  RETURN jsonb_build_object(
    'pending', v_pending,
    'archived', v_archived,
    'archives', v_archives
  );
END;
$$;

COMMENT ON FUNCTION public.get_instagram_sync_status IS
'Get Instagram sync queue status for a user. Returns pending count, archived count, and archive details.';

-- ============================================================================
-- PART 2: User-Level Retry All
-- ============================================================================

CREATE OR REPLACE FUNCTION public.retry_all_instagram_imports(
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
  -- Security: verify caller owns the archives they're trying to retry
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only retry your own archives';
  END IF;

  FOR v_msg IN
    SELECT msg_id, message
    FROM pgmq.a_instagram_imports
    WHERE (message->>'user_id')::UUID = p_user_id
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

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_all_instagram_imports(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_all_instagram_imports(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_all_instagram_imports(UUID) TO service_role;

COMMENT ON FUNCTION public.retry_all_instagram_imports IS
'Retry ALL archived Instagram imports for a user. Re-queues entire archive.';

-- ============================================================================
-- PART 3: Admin Functions (service_role only)
-- ============================================================================

-- 3.1 Get ALL archived imports (across all users)
CREATE OR REPLACE FUNCTION public.admin_get_instagram_archives()
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
  FROM pgmq.a_instagram_imports
  ORDER BY archived_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_instagram_archives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_instagram_archives() TO service_role;

COMMENT ON FUNCTION public.admin_get_instagram_archives IS
'ADMIN: Get all archived Instagram imports across all users. Service role only.';

-- 3.2 Retry ALL archived imports (across all users)
CREATE OR REPLACE FUNCTION public.admin_retry_all_instagram_archives()
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
    FROM pgmq.a_instagram_imports
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

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_retry_all_instagram_archives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_all_instagram_archives() TO service_role;

COMMENT ON FUNCTION public.admin_retry_all_instagram_archives IS
'ADMIN: Retry ALL archived Instagram imports across all users. Service role only.';

-- 3.3 Retry specific archived imports by msg_id (no user filter)
CREATE OR REPLACE FUNCTION public.admin_retry_instagram_import(
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

REVOKE EXECUTE ON FUNCTION public.admin_retry_instagram_import(BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_instagram_import(BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.admin_retry_instagram_import IS
'ADMIN: Retry specific archived Instagram imports by msg_id. No user filtering. Service role only.';

COMMIT;
