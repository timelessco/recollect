import * as Sentry from "@sentry/nextjs";

import { createServiceClient } from "@/utils/supabaseClient";

export interface StoreQueueErrorProps {
  errorReason: string;
  msgId: number | undefined;
  queueName: string | undefined;
  route: string;
}

/**
 * Store an error reason on a queue message via the `update_queue_message_error` RPC.
 * Safe to call with undefined queueName/msgId (no-ops silently).
 * Creates its own service client so it can be called before handler setup.
 */
export async function storeQueueError(props: StoreQueueErrorProps) {
  const { errorReason, msgId, queueName, route } = props;

  if (!queueName || msgId === undefined) {
    return;
  }

  try {
    const supabase = createServiceClient();
    const { error: rpcError } = await supabase.rpc("update_queue_message_error", {
      p_error: errorReason,
      p_msg_id: msgId,
      p_queue_name: queueName,
    });

    if (rpcError) {
      console.error(`[${route}] Failed to store queue error:`, {
        errorReason,
        msgId,
        queueName,
        rpcError,
      });
      Sentry.captureException(rpcError, {
        extra: { errorReason, msgId, queueName },
        tags: { operation: "store_queue_error", route },
      });
    }
  } catch (error) {
    console.error(`[${route}] Failed to store queue error:`, {
      errorReason,
      msgId,
      queueName,
    });
    Sentry.captureException(error, {
      extra: { errorReason, msgId, queueName },
      tags: { operation: "store_queue_error", route },
    });
  }
}
