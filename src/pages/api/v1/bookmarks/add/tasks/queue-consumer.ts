import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import { type NextApiRequest } from "../../../../../../types/apiTypes";
import { formatErrorMessage } from "../../../../../../utils/api/bookmark/errorHandling";
import {
	ADD_BOOKMARK_REMAINING_DATA_API,
	ADD_BOOKMARK_SCREENSHOT_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";

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
export default async function handler(
	request: NextApiRequest<Record<string, never>>,
	response: NextApiResponse<ApiResponse>,
) {
	try {
		// Authenticate internal API key
		const apiKey =
			request.headers["x-api-key"] ||
			request.headers.authorization?.replace("Bearer ", "");

		if (apiKey !== process.env.INTERNAL_API_KEY) {
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

		const supabase = apiSupabaseClient(request, response);
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
			Sentry.captureException("Error reading from queue", {
				extra: { error: readError.message, queueName },
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

		console.log(`\n========================================`);
		console.log(`📥 Processing ${messages.length} message(s) from queue`);
		console.log(`========================================\n`);

		// Process each message
		const results: MessageResult[] = [];
		let archivedCount = 0;
		let failedCount = 0;

		for (const message of messages) {
			console.log(`\n----- Processing Message -----`);
			console.log("Message ID:", message.msg_id);
			console.log("Message payload:", JSON.stringify(message.message, null, 2));

			// Parse the message payload
			const payload = message.message as QueueMessagePayload;

			// Validate payload structure
			if (
				!payload.bookmarkId ||
				!payload.url ||
				typeof payload.isImage !== "boolean"
			) {
				const errorMessage = "Invalid message payload structure";
				console.log("❌", errorMessage);
				console.log("⚠️ Message will remain in queue for retry");

				Sentry.captureException("Invalid queue message payload", {
					extra: {
						error: errorMessage,
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

			console.log(`📌 Processing bookmark ID: ${payload.bookmarkId}`);

			let screenshotSuccess = true;
			let screenshotError: string | undefined;
			let remainingDataSuccess = false;
			let remainingDataError: string | undefined;
			let shouldArchive = false;

			// Call screenshot API if URL is not an image
			if (payload.isImage) {
				console.log("ℹ️ Skipping screenshot (URL is an image)");
			} else {
				console.log("📸 Calling screenshot API...");
				try {
					const screenshotResponse = await axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${ADD_BOOKMARK_SCREENSHOT_API}`,
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
					);

					screenshotSuccess = screenshotResponse.status === 200;
					if (screenshotSuccess) {
						console.log("✅ Screenshot API succeeded");
					} else {
						screenshotError = `Screenshot API returned status ${screenshotResponse.status}`;
						console.log(`⚠️ ${screenshotError}`);
					}
				} catch (error) {
					screenshotError = formatErrorMessage(error);
					console.log("❌ Screenshot API failed:", screenshotError);
					screenshotSuccess = false;
					// Continue to try remaining API even if screenshot fails
				}
			}

			// Call remaining data API
			console.log("📝 Calling remaining data API...");
			try {
				const remainingResponse = await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${ADD_BOOKMARK_REMAINING_DATA_API}`,
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
				);

				if (remainingResponse.status === 200) {
					console.log("✅ Remaining data API succeeded");
					remainingDataSuccess = true;
					// Only archive if both screenshot (when required) and remaining data succeeded
					shouldArchive = screenshotSuccess && remainingDataSuccess;
					// shouldArchive = remainingDataSuccess;
				} else {
					remainingDataError = `Remaining data API returned status ${remainingResponse.status}`;
					console.log(`❌ ${remainingDataError}`);
				}
			} catch (error) {
				remainingDataError = formatErrorMessage(error);
				console.log("❌ Remaining data API failed:", remainingDataError);
			}

			// Only archive if remaining data API succeeded
			if (shouldArchive) {
				console.log("🗄️ Archiving message...");
				const { error: archiveError } = await supabase
					.schema("pgmq_public")
					.rpc("archive", {
						queue_name: queueName,
						message_id: message.msg_id,
					});

				if (archiveError) {
					console.log("⚠️ Failed to archive message:", archiveError.message);
					Sentry.captureException("Error archiving message from queue", {
						extra: {
							error: archiveError.message,
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
					console.log("✅ Message successfully archived");
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
				console.log("⚠️ Message will remain in queue for retry");

				const combinedError = [
					screenshotError && `Screenshot: ${screenshotError}`,
					remainingDataError && `Remaining data: ${remainingDataError}`,
				]
					.filter(Boolean)
					.join("; ");

				Sentry.captureException("Failed to process queue message", {
					extra: {
						error: combinedError,
						messageId: message.msg_id,
						bookmarkId: payload.bookmarkId,
						screenshotSuccess,
						remainingDataSuccess,
					},
				});

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

		console.log(`\n========================================`);
		console.log(
			`✅ Processed: ${messages.length} | Archived: ${archivedCount} | Failed: ${failedCount}`,
		);
		console.log(`========================================\n`);

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
		Sentry.captureException("Unexpected error in queue consumer", {
			extra: { error: errorMessage },
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
