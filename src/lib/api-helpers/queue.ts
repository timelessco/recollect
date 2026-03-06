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
		const { error: rpcError } = await supabase.rpc(
			"update_queue_message_error",
			{
				p_queue_name: queueName,
				p_msg_id: msgId,
				p_error: errorReason,
			},
		);

		if (rpcError) {
			console.error(`[${route}] Failed to store queue error:`, {
				queueName,
				msgId,
				errorReason,
				rpcError,
			});
			Sentry.captureException(rpcError, {
				tags: { operation: "store_queue_error", route },
				extra: { queueName, msgId, errorReason },
			});
		}
	} catch (error) {
		console.error(`[${route}] Failed to store queue error:`, {
			queueName,
			msgId,
			errorReason,
		});
		Sentry.captureException(error, {
			tags: { operation: "store_queue_error", route },
			extra: { queueName, msgId, errorReason },
		});
	}
}
