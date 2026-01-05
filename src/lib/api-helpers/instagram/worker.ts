import { type SupabaseClient } from "@supabase/supabase-js";

import { addCategoriesToBookmark } from "./add-categories-to-bookmark";
import { type InstagramMetaDataWithCollections } from "@/lib/api-helpers/instagram/schemas";
import { type Database } from "@/types/database-generated.types";

const ROUTE = "instagram-category-worker";

type BookmarkMessage = {
	id: number;
	user_id: string;
	meta_data: InstagramMetaDataWithCollections | null;
};

/**
 * Processes messages from the "imports" queue for category linking.
 * Similar to processImageQueue but handles category linking instead of image processing.
 * @param supabase - Supabase client (should be service client)
 * @param parameters - Queue processing parameters
 * @param parameters.queue_name - Name of the queue to process
 * @param parameters.batchSize - Number of messages to process in one batch
 * @returns Promise that resolves with message ID if processed, or undefined if queue is empty
 */
export async function processImportsQueue(
	supabase: SupabaseClient<Database>,
	parameters: { batchSize: number; queue_name: string },
): Promise<{ messageId?: number } | undefined> {
	const { queue_name, batchSize } = parameters;
	const SLEEP_SECONDS = 30;
	const MAX_RETRIES = 3;

	try {
		// Type assertion needed because pgmq_public schema is not in the Database type
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const pgmqSupabase = (supabase as any).schema("pgmq_public");

		// Read messages from queue
		const { data: messages, error: messageError } = await pgmqSupabase.rpc(
			"read",
			{
				queue_name,
				sleep_seconds: SLEEP_SECONDS,
				// eslint-disable-next-line id-length
				n: batchSize,
			},
		);

		if (messageError) {
			console.error(
				`[${ROUTE}] Error fetching messages from queue:`,
				messageError,
			);
			throw messageError;
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			console.log(`[${ROUTE}] No messages found in queue`);
			return undefined;
		}

		// Process each message
		for (const message of messages) {
			const messageData = message as {
				message: BookmarkMessage;
				read_ct: number;
				msg_id: number;
			};
			try {
				const bookmarkData = messageData.message;
				const read_ct = messageData.read_ct;

				// archive message if max retries exceeded
				if (read_ct > MAX_RETRIES) {
					console.log(
						`[${ROUTE}] Deleting message from queue (max retries exceeded)`,
						message,
					);

					const { error: archiveError } = await pgmqSupabase.rpc("archive", {
						queue_name,
						message_id: messageData.msg_id,
					});

					if (archiveError) {
						console.error(`[${ROUTE}] Error archiving message`, archiveError);
					}

					continue;
				}

				// Process category linking
				const result = await addCategoriesToBookmark({
					supabase,
					bookmark: {
						id: bookmarkData.id,
						user_id: bookmarkData.user_id,
						meta_data: bookmarkData.meta_data,
					},
					route: ROUTE,
				});

				if (result.error === null) {
					// delete message on success
					const { error: deleteError } = await pgmqSupabase.rpc("delete", {
						queue_name,
						message_id: messageData.msg_id,
					});

					if (deleteError) {
						console.error(`[${ROUTE}] Error deleting message`, deleteError);
					}
				} else {
					// Message will be retried automatically by pgmq
					console.warn(
						`[${ROUTE}] Category linking failed, message will be retried`,
						result.error,
					);
				}
			} catch (error) {
				console.error(
					`[${ROUTE}] Processing failed for message:`,
					messageData,
					error,
				);
			}
		}

		const firstMessage = Array.isArray(messages)
			? (messages[0] as { msg_id: number } | undefined)
			: null;
		return { messageId: firstMessage?.msg_id };
	} catch (error) {
		console.error(`[${ROUTE}] Queue processing error:`, error);
		throw error;
	}
}
