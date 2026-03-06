-- ============================================================================
-- Migration: AI-Embeddings Archive Retry Functions
-- ============================================================================
-- Adds retry capability for archived ai-embeddings queue items:
-- 1. retry_ai_embeddings_archive(p_msg_ids) - Retry specific archives by msg_id
-- 2. admin_retry_ai_embeddings_archives(p_count) - Retry archives (all or limited)
-- Both add is_final_retry flag so worker permanently deletes on final failure.
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Retry specific archived items by msg_id (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.retry_ai_embeddings_archive(
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
    FROM pgmq."a_ai-embeddings"
    WHERE msg_id = ANY(p_msg_ids)
  LOOP
    -- Re-queue with is_final_retry flag (strip failure metadata)
    PERFORM pgmq.send(
      'ai-embeddings',
      (v_msg.message - 'failure_reason' - 'failed_at' - 'last_error' - 'last_error_at')
        || '{"is_final_retry": true}'::jsonb
    );

    -- Delete from archive
    DELETE FROM pgmq."a_ai-embeddings" WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'requeued', v_requeued,
    'requested', array_length(p_msg_ids, 1)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_ai_embeddings_archive(BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_ai_embeddings_archive(BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_ai_embeddings_archive IS
'Retry specific archived ai-embeddings items by msg_id. Adds is_final_retry flag — items are permanently deleted if they fail again. Service role only.';

-- ============================================================================
-- PART 2: Retry archived items with optional count limit (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_retry_ai_embeddings_archives(
  p_count INT DEFAULT NULL
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
    FROM pgmq."a_ai-embeddings"
    ORDER BY msg_id ASC
    LIMIT p_count -- NULL means no limit (all rows)
  LOOP
    -- Re-queue with is_final_retry flag (strip failure metadata)
    PERFORM pgmq.send(
      'ai-embeddings',
      (v_msg.message - 'failure_reason' - 'failed_at' - 'last_error' - 'last_error_at')
        || '{"is_final_retry": true}'::jsonb
    );

    -- Delete from archive
    DELETE FROM pgmq."a_ai-embeddings" WHERE msg_id = v_msg.msg_id;

    v_requeued := v_requeued + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued', v_requeued);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_retry_ai_embeddings_archives(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_ai_embeddings_archives(INT) TO service_role;

COMMENT ON FUNCTION public.admin_retry_ai_embeddings_archives IS
'Retry archived ai-embeddings items. Pass p_count to limit how many (oldest first), or NULL to retry all. Adds is_final_retry flag — items are permanently deleted if they fail again. Service role only.';

COMMIT;
