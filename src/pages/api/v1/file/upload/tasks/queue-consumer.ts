import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";

import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
} from "../../../../../../types/apiTypes";
import {
	getBaseUrl,
	NEXT_API_URL,
	UPLOAD_FILE_APIS,
} from "../../../../../../utils/constants";
import { apiSupabaseServiceClient } from "../../../../../../utils/supabaseServerClient";
import { vet } from "../../../../../../utils/try";

type QueueMessagePayload = {
	id: SingleListData["id"];
	publicUrl: string;
	mediaType: ImgMetadataType["mediaType"];
};

type MessageResult = {
	messageId: number;
	fileId: number;
	success: boolean;
	archived: boolean;
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
 * Queue consumer API that reads messages from the upload-file-queue,
 * processes each one by calling the remaining data API,
 * and archives only the successful ones.
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
		const queueName = "upload-file-queue";
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

		console.log("File upload queue consumer API called:", {
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
			if (!payload.id || !payload.publicUrl) {
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
					fileId: payload?.id ?? 0,
					success: false,
					archived: false,
					error: errorMessage,
				});
				continue;
			}

			console.log("Processing file:", {
				fileId: payload.id,
				publicUrl: payload.publicUrl,
				mediaType: payload.mediaType,
			});

			let remainingDataSuccess = false;
			let remainingDataError: string | undefined;
			let shouldArchive = false;

			// Call remaining data API
			console.log("Calling remaining data API:", {
				fileId: payload.id,
				publicUrl: payload.publicUrl,
			});
			const remainingApiUrl = `${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_APIS.REMAINING}`;

			const [remainingApiError, remainingResponse] = await vet(() =>
				axios.post(
					remainingApiUrl,
					{
						id: payload.id,
						publicUrl: payload.publicUrl,
						mediaType: payload.mediaType,
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
					fileId: payload.id,
					error: remainingApiError,
				});
				remainingDataError = "Remaining data API failed";
			} else if (remainingResponse.status === 200) {
				console.log("Remaining data API succeeded:", {
					fileId: payload.id,
				});
				remainingDataSuccess = true;
				shouldArchive = true;
			} else {
				remainingDataError = `Remaining data API returned status ${remainingResponse.status}`;
				console.error("Remaining data API returned non-200 status:", {
					fileId: payload.id,
					status: remainingResponse.status,
				});
			}

			// Only archive if remaining data API succeeded
			if (shouldArchive) {
				console.log("Archiving message:", {
					messageId: message.msg_id,
					fileId: payload.id,
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
						fileId: payload.id,
						error: archiveError.message,
					});
					Sentry.captureException(archiveError, {
						tags: {
							operation: "archive_queue_message",
						},
						extra: {
							queueName,
							messageId: message.msg_id,
							fileId: payload.id,
						},
					});

					failedCount++;
					results.push({
						messageId: message.msg_id,
						fileId: payload.id,
						success: true,
						archived: false,
						remainingDataSuccess,
						error: `Processing succeeded but failed to archive: ${archiveError.message}`,
					});
				} else {
					console.log("Message successfully archived:", {
						messageId: message.msg_id,
						fileId: payload.id,
					});
					archivedCount++;
					results.push({
						messageId: message.msg_id,
						fileId: payload.id,
						success: true,
						archived: true,
						remainingDataSuccess,
					});
				}
			} else {
				// Processing failed, don't archive
				console.log("Message will remain in queue for retry:", {
					messageId: message.msg_id,
					fileId: payload.id,
					remainingDataSuccess,
				});

				Sentry.captureException(
					new Error(remainingDataError || "Processing failed"),
					{
						tags: {
							operation: "process_queue_message",
						},
						extra: {
							messageId: message.msg_id,
							fileId: payload.id,
							remainingDataSuccess,
						},
					},
				);

				failedCount++;
				results.push({
					messageId: message.msg_id,
					fileId: payload.id,
					success: false,
					archived: false,
					remainingDataSuccess,
					error: remainingDataError || "Processing failed",
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
