-- ============================================================================
-- Migration: AI-Embeddings Retry RPCs — Self-NULL Stale Screenshot URLs
-- ============================================================================
-- Extends retry_ai_embeddings_archive + admin_retry_ai_embeddings_archives
-- to NULL stale screenshot_imgs ogImage URLs on public.everything as part of
-- the same transaction, but ONLY when the archived message's failure matches
-- the 0-byte-bug signature ("Unable to process input image" / "Empty image
-- body"). This closes the ops footgun where a caller who forgets the NULL
-- sweep hits:
--   replay → idempotency-skip on stale ogImage → Gemini INVALID_ARGUMENT →
--   is_final_retry permanent deletion of an otherwise-recoverable bookmark.
-- Non-0-byte replays are untouched (gate requires BOTH signature match AND
-- ogImage LIKE 'https://media%.recollect.so/%screenshot_imgs%').
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
  v_nulled_count INT := 0;
  v_is_zero_byte_victim BOOLEAN;
BEGIN
  FOR v_msg IN
    SELECT msg_id, message
    FROM pgmq."a_ai-embeddings"
    WHERE msg_id = ANY(p_msg_ids)
  LOOP
    v_is_zero_byte_victim :=
      COALESCE(v_msg.message->>'last_error', '') LIKE '%Unable to process input image%'
      OR COALESCE(v_msg.message->>'last_error', '') LIKE '%Empty image body%'
      OR COALESCE(v_msg.message->>'failure_reason', '') LIKE '%Empty image body%'
      OR COALESCE(v_msg.message->>'failure_reason', '') LIKE '%Unable to process input image%';

    -- Self-NULL stale screenshot URL so replay re-captures instead of
    -- short-circuiting on the idempotency check. Gated by error signature
    -- AND URL pattern — regular archive replays never touch everything.
    IF v_is_zero_byte_victim THEN
      UPDATE public.everything
      SET "ogImage" = NULL,
          meta_data = meta_data - 'ogImgBlurUrl' - 'height' - 'width'
      WHERE id = (v_msg.message->>'id')::BIGINT
        AND "ogImage" LIKE 'https://media%.recollect.so/%screenshot_imgs%';

      IF FOUND THEN
        v_nulled_count := v_nulled_count + 1;
      END IF;
    END IF;

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
    'requested', array_length(p_msg_ids, 1),
    'nulled_ogimage_count', v_nulled_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_ai_embeddings_archive(BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_ai_embeddings_archive(BIGINT[]) TO service_role;

COMMENT ON FUNCTION public.retry_ai_embeddings_archive IS
'Retry specific archived ai-embeddings items by msg_id. Adds is_final_retry flag — items are permanently deleted if they fail again. For messages whose last_error/failure_reason matches the 0-byte screenshot bug, also NULLs stale https://media*.recollect.so/*screenshot_imgs* URLs on public.everything so replay re-captures instead of short-circuiting. Service role only.';

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
  v_nulled_count INT := 0;
  v_is_zero_byte_victim BOOLEAN;
BEGIN
  FOR v_msg IN
    SELECT msg_id, message
    FROM pgmq."a_ai-embeddings"
    ORDER BY msg_id ASC
    LIMIT p_count -- NULL means no limit (all rows)
  LOOP
    v_is_zero_byte_victim :=
      COALESCE(v_msg.message->>'last_error', '') LIKE '%Unable to process input image%'
      OR COALESCE(v_msg.message->>'last_error', '') LIKE '%Empty image body%'
      OR COALESCE(v_msg.message->>'failure_reason', '') LIKE '%Empty image body%'
      OR COALESCE(v_msg.message->>'failure_reason', '') LIKE '%Unable to process input image%';

    IF v_is_zero_byte_victim THEN
      UPDATE public.everything
      SET "ogImage" = NULL,
          meta_data = meta_data - 'ogImgBlurUrl' - 'height' - 'width'
      WHERE id = (v_msg.message->>'id')::BIGINT
        AND "ogImage" LIKE 'https://media%.recollect.so/%screenshot_imgs%';

      IF FOUND THEN
        v_nulled_count := v_nulled_count + 1;
      END IF;
    END IF;

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
    'nulled_ogimage_count', v_nulled_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_retry_ai_embeddings_archives(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_ai_embeddings_archives(INT) TO service_role;

COMMENT ON FUNCTION public.admin_retry_ai_embeddings_archives IS
'Retry archived ai-embeddings items. Pass p_count to limit how many (oldest first), or NULL to retry all. Adds is_final_retry flag — items are permanently deleted if they fail again. For messages whose last_error/failure_reason matches the 0-byte screenshot bug, also NULLs stale https://media*.recollect.so/*screenshot_imgs* URLs on public.everything so replay re-captures instead of short-circuiting. Service role only.';

COMMIT;
