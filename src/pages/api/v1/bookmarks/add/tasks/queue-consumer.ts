import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import { type NextApiRequest } from "../../../../../../types/apiTypes";
import {
	ADD_BOOKMARK_REMAINING_DATA_API,
	ADD_BOOKMARK_SCREENSHOT_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../../../../../utils/constants";
import { apiSupabaseServiceClient } from "../../../../../../utils/supabaseServerClient";
import { vet } from "../../../../../../utils/try";

type QueueMessagePayload = {
	bookmarkId: number;
	url: string;
	userId: string;
	favIcon: string | null;
	isImage: boolean;
};

type MessageResult = {
	messageId: number;
	bookmarkId: number;
	success: boolean;
	archived: boolean;
	screenshotSuccess?: boolean;
	remainingDataSuccess?: boolean;
	error?: string;
};

type ApiResponse = {
	success: boolean;
	message: string;
	processedCount: number;
	archivedCount: number;
	failedCount: number;
	results: MessageResult[];
	error?: string;
};

/**
 * Queue consumer API that reads messages from the queue,
 * processes each one, and deletes only the successful ones.
 */
export async function handler(
	request: NextApiRequest<Record<string, never>>,
	response: NextApiResponse<ApiResponse>,
) {
	try {
		// Authenticate internal API key
		const apiKey =
			request.headers["x-api-key"] ||
			request.headers.authorization?.replace("Bearer ", "");

		if (apiKey !== process.env.INTERNAL_API_KEY) {
			console.warn("Unauthorized - Invalid API key");
			response.status(401).json({
				success: false,
				message: "Unauthorized - Invalid API key",
				processedCount: 0,
				archivedCount: 0,
				failedCount: 0,
				results: [],
				error: "Unauthorized",
			});
			return;
		}

		const supabase = apiSupabaseServiceClient();
		const queueName = "add-bookmark-url-queue";
		// Process up to 10 messages at a time
		const batchSize = 10;

		// Read messages from the queue
		const { data: messages, error: readError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: queueName,
				sleep_seconds: 0,
				// eslint-disable-next-line id-length
				n: batchSize,
			});

		if (readError) {
			console.error("Error reading from queue:", readError);
			Sentry.captureException(readError, {
				tags: {
					operation: "read_queue",
				},
				extra: {
					queueName,
				},
			});

			response.status(500).json({
				success: false,
				message: "Failed to read from queue",
				processedCount: 0,
				archivedCount: 0,
				failedCount: 0,
				results: [],
				error: readError.message,
			});
			return;
		}

		// Check if there are any messages
		if (!messages || messages.length === 0) {
			response.status(200).json({
				success: true,
				message: "No messages in queue",
				processedCount: 0,
				archivedCount: 0,
				failedCount: 0,
				results: [],
			});
			return;
		}

		console.log("Queue consumer API called:", {
			messageCount: messages.length,
			queueName,
		});

		// Process each message
		const results: MessageResult[] = [];
		let archivedCount = 0;
		let failedCount = 0;

		for (const message of messages) {
			console.log("Processing queue message:", {
				messageId: message.msg_id,
				payload: message.message,
			});

			// Parse the message payload
			const payload = message.message as QueueMessagePayload;

			// Validate payload structure
			if (
				!payload.bookmarkId ||
				!payload.url ||
				typeof payload.isImage !== "boolean"
			) {
				const errorMessage = "Invalid message payload structure";
				console.warn("Invalid queue message payload:", {
					messageId: message.msg_id,
					payload: message.message,
				});

				Sentry.captureException(new Error(errorMessage), {
					tags: {
						operation: "validate_queue_message",
					},
					extra: {
						messageId: message.msg_id,
						payload: message.message,
					},
				});

				failedCount++;
				results.push({
					messageId: message.msg_id,
					bookmarkId: payload?.bookmarkId ?? 0,
					success: false,
					archived: false,
					error: errorMessage,
				});
				continue;
			}

			console.log("Processing bookmark:", {
				bookmarkId: payload.bookmarkId,
				url: payload.url,
			});

			let screenshotSuccess = true;
			let screenshotError: string | undefined;
			let remainingDataSuccess = false;
			let remainingDataError: string | undefined;
			let shouldArchive = false;

			// Call screenshot API if URL is not an image
			if (payload.isImage) {
				console.log("Skipping screenshot because URL is an image:", {
					bookmarkId: payload.bookmarkId,
				});
			} else {
				console.log("Calling screenshot API:", {
					bookmarkId: payload.bookmarkId,
					url: payload.url,
				});
				const screenshotApiUrl = `${getBaseUrl()}${NEXT_API_URL}${ADD_BOOKMARK_SCREENSHOT_API}`;

				const [screenshotApiError, screenshotResponse] = await vet(() =>
					axios.post(
						screenshotApiUrl,
						{
							id: payload.bookmarkId,
							url: payload.url,
							userId: payload.userId,
						},
						{
							headers: {
								"x-api-key": process.env.INTERNAL_API_KEY,
							},
						},
					),
				);

				if (screenshotApiError) {
					console.error("Screenshot API failed:", {
						bookmarkId: payload.bookmarkId,
						error: screenshotApiError,
					});
					screenshotError = "Screenshot API failed";
					screenshotSuccess = false;
					// Continue to try remaining API even if screenshot fails
				} else {
					screenshotSuccess = screenshotResponse.status === 200;
					if (screenshotSuccess) {
						console.log("Screenshot API succeeded:", {
							bookmarkId: payload.bookmarkId,
						});
					} else {
						screenshotError = `Screenshot API returned status ${screenshotResponse.status}`;
						console.warn("Screenshot API returned non-200 status:", {
							bookmarkId: payload.bookmarkId,
							status: screenshotResponse.status,
						});
					}
				}
			}

			// Call remaining data API
			console.log("Calling remaining data API:", {
				bookmarkId: payload.bookmarkId,
				url: payload.url,
			});
			const remainingApiUrl = `${getBaseUrl()}${NEXT_API_URL}${ADD_BOOKMARK_REMAINING_DATA_API}`;

			const [remainingApiError, remainingResponse] = await vet(() =>
				axios.post(
					remainingApiUrl,
					{
						id: payload.bookmarkId,
						url: payload.url,
						favIcon: payload.favIcon,
						userId: payload.userId,
					},
					{
						headers: {
							"x-api-key": process.env.INTERNAL_API_KEY,
						},
					},
				),
			);

			if (remainingApiError) {
				console.error("Remaining data API failed:", {
					bookmarkId: payload.bookmarkId,
					error: remainingApiError,
				});
				remainingDataError = "Remaining data API failed";
			} else if (remainingResponse.status === 200) {
				console.log("Remaining data API succeeded:", {
					bookmarkId: payload.bookmarkId,
				});
				remainingDataSuccess = true;
				// Only archive if both screenshot (when required) and remaining data succeeded
				shouldArchive = screenshotSuccess && remainingDataSuccess;
			} else {
				remainingDataError = `Remaining data API returned status ${remainingResponse.status}`;
				console.error("Remaining data API returned non-200 status:", {
					bookmarkId: payload.bookmarkId,
					status: remainingResponse.status,
				});
			}

			// Only archive if remaining data API succeeded
			if (shouldArchive) {
				console.log("Archiving message:", {
					messageId: message.msg_id,
					bookmarkId: payload.bookmarkId,
				});
				const { error: archiveError } = await supabase
					.schema("pgmq_public")
					.rpc("archive", {
						queue_name: queueName,
						message_id: message.msg_id,
					});

				if (archiveError) {
					console.error("Failed to archive message:", {
						messageId: message.msg_id,
						bookmarkId: payload.bookmarkId,
						error: archiveError.message,
					});
					Sentry.captureException(archiveError, {
						tags: {
							operation: "archive_queue_message",
							userId: payload.userId,
						},
						extra: {
							queueName,
							messageId: message.msg_id,
							bookmarkId: payload.bookmarkId,
						},
					});

					failedCount++;
					results.push({
						messageId: message.msg_id,
						bookmarkId: payload.bookmarkId,
						success: true,
						archived: false,
						screenshotSuccess,
						remainingDataSuccess,
						error: `Processing succeeded but failed to archive: ${archiveError.message}`,
					});
				} else {
					console.log("Message successfully archived:", {
						messageId: message.msg_id,
						bookmarkId: payload.bookmarkId,
					});
					archivedCount++;
					results.push({
						messageId: message.msg_id,
						bookmarkId: payload.bookmarkId,
						success: true,
						archived: true,
						screenshotSuccess,
						remainingDataSuccess,
					});
				}
			} else {
				// Processing failed, don't archive
				console.log("Message will remain in queue for retry:", {
					messageId: message.msg_id,
					bookmarkId: payload.bookmarkId,
					screenshotSuccess,
					remainingDataSuccess,
				});

				const combinedError = [
					screenshotError && `Screenshot: ${screenshotError}`,
					remainingDataError && `Remaining data: ${remainingDataError}`,
				]
					.filter(Boolean)
					.join("; ");

				Sentry.captureException(
					new Error(combinedError || "Processing failed"),
					{
						tags: {
							operation: "process_queue_message",
							userId: payload.userId,
						},
						extra: {
							messageId: message.msg_id,
							bookmarkId: payload.bookmarkId,
							screenshotSuccess,
							remainingDataSuccess,
						},
					},
				);

				failedCount++;
				results.push({
					messageId: message.msg_id,
					bookmarkId: payload.bookmarkId,
					success: false,
					archived: false,
					screenshotSuccess,
					remainingDataSuccess,
					error: combinedError || "Processing failed",
				});
			}
		}

		console.log("Queue processing completed:", {
			processedCount: messages.length,
			archivedCount,
			failedCount,
		});

		// Return success response with details
		response.status(200).json({
			success: true,
			message: "Queue processing completed",
			processedCount: messages.length,
			archivedCount,
			failedCount,
			results,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		console.error("Unexpected error in queue consumer:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "queue_consumer_unexpected",
			},
		});

		response.status(500).json({
			success: false,
			message: "Internal server error",
			processedCount: 0,
			archivedCount: 0,
			failedCount: 0,
			results: [],
			error: errorMessage,
		});
	}
}
