import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import { addCategoriesToBookmarks } from "./add-categories-to-bookmark";
import { type InstagramMetaDataWithCollections } from "@/lib/api-helpers/instagram/schemas";
import { type Database } from "@/types/database-generated.types";
import { createPGMQClient } from "@/utils/constants";

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
		const pgmqSupabase = createPGMQClient(supabase);

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
			Sentry.captureException(messageError, {
				tags: { operation: "fetch_messages", queue_name },
				extra: { batchSize },
			});
			throw messageError;
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			console.log(`[${ROUTE}] No messages found in queue`);
			return undefined;
		}

		// Separate messages by retry status
		const maxRetryMessages: Array<{
			message: BookmarkMessage;
			read_ct: number;
			msg_id: number;
		}> = [];
		const processableMessages: Array<{
			message: BookmarkMessage;
			read_ct: number;
			msg_id: number;
		}> = [];

		for (const message of messages) {
			const messageData = message as {
				message: BookmarkMessage;
				read_ct: number;
				msg_id: number;
			};
			if (messageData.read_ct > MAX_RETRIES) {
				maxRetryMessages.push(messageData);
			} else {
				processableMessages.push(messageData);
			}
		}

		// Archive max-retry messages
		for (const messageData of maxRetryMessages) {
			const bookmarkData = messageData.message;

			console.log(
				`[${ROUTE}] Archiving message from queue (max retries exceeded)`,
				messageData,
			);

			const { error: archiveError } = await pgmqSupabase.rpc("archive", {
				queue_name,
				message_id: messageData.msg_id,
			});

			if (archiveError) {
				console.error(
					`[${ROUTE}] Error archiving message so deleting it`,
					archiveError,
				);
				Sentry.captureException(archiveError, {
					tags: { operation: "archive_failed_message", queue_name },
					extra: {
						messageId: messageData.msg_id,
						bookmarkId: bookmarkData?.id,
						readCount: messageData.read_ct,
					},
				});
				const { error: deleteError } = await pgmqSupabase.rpc("delete", {
					queue_name,
					message_id: messageData.msg_id,
				});
				if (deleteError) {
					console.error(`[${ROUTE}] Error deleting message`, deleteError);
					Sentry.captureException(deleteError, {
						tags: { operation: "delete_message", queue_name },
						extra: {
							messageId: messageData.msg_id,
							bookmarkId: bookmarkData?.id,
							readCount: messageData.read_ct,
						},
					});
				}
			}
		}

		// Batch process remaining messages
		if (processableMessages.length > 0) {
			console.log(
				`[${ROUTE}] Batch processing ${processableMessages.length} bookmarks`,
			);

			const bookmarks = processableMessages.map((msg) => ({
				id: msg.message.id,
				user_id: msg.message.user_id,
				meta_data: msg.message.meta_data,
			}));

			try {
				const batchResult = await addCategoriesToBookmarks({
					supabase,
					bookmarks,
					route: ROUTE,
				});

				// Map bookmark IDs to message IDs for deletion
				const bookmarkToMessage = new Map(
					processableMessages.map((msg) => [msg.message.id, msg.msg_id]),
				);

				// Delete successful messages
				for (const bookmarkId of batchResult.successful) {
					const msgId = bookmarkToMessage.get(bookmarkId);
					if (msgId) {
						const { error: deleteError } = await pgmqSupabase.rpc("delete", {
							queue_name,
							message_id: msgId,
						});
						if (deleteError) {
							console.error(`[${ROUTE}] Error deleting message`, deleteError);
							Sentry.captureException(deleteError, {
								tags: { operation: "delete_message", queue_name },
								extra: {
									messageId: msgId,
									bookmarkId,
								},
							});
						}
					}
				}

				// Log failed bookmarks (messages remain in queue for retry)
				for (const failure of batchResult.failed) {
					console.warn(
						`[${ROUTE}] Category linking failed for bookmark ${failure.bookmarkId}: ${failure.error}`,
					);
					Sentry.captureMessage(
						`Category linking failed for bookmark ${failure.bookmarkId}`,
						{
							level: "warning",
							tags: { operation: "batch_process_failed", queue_name },
							extra: {
								bookmarkId: failure.bookmarkId,
								error: failure.error,
							},
						},
					);
				}

				console.log(
					`[${ROUTE}] Batch processing complete: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`,
				);
			} catch (error) {
				console.error(`[${ROUTE}] Batch processing error:`, error);
				Sentry.captureException(error, {
					tags: { operation: "batch_processing", queue_name },
					extra: {
						bookmarkCount: bookmarks.length,
					},
				});
				// On batch processing error, messages remain in queue for retry
			}
		}

		const firstMessage = Array.isArray(messages)
			? (messages[0] as { msg_id: number } | undefined)
			: null;
		return { messageId: firstMessage?.msg_id };
	} catch (error) {
		console.error(`[${ROUTE}] Queue processing error:`, error);
		Sentry.captureException(error, {
			tags: { operation: "queue_processing", queue_name },
			extra: { batchSize },
		});
		throw error;
	}
}
