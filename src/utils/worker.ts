import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import {
	AI_ENRICHMENT_API,
	getBaseUrl,
	instagramType,
	NEXT_API_URL,
	tweetType,
	WORKER_SCREENSHOT_API,
} from "./constants";

type ProcessParameters = { batchSize: number; queue_name: string };

const SLEEP_SECONDS = 30;

// max retries for a message
const MAX_RETRIES = 3;
export const processImageQueue = async (
	supabase: SupabaseClient,
	parameters: ProcessParameters,
) => {
	const { queue_name, batchSize } = parameters;

	try {
		const { data: messages, error: messageError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name,
				sleep_seconds: SLEEP_SECONDS,
				// eslint-disable-next-line id-length
				n: batchSize,
			});

		if (messageError) {
			console.error(
				"[process-image-queue] Error fetching messages from queue:",
				messageError,
			);
			throw messageError;
		}

		if (!messages?.length) {
			console.log("[process-image-queue] No messages found in queue");
			return;
		}

		for (const message of messages) {
			try {
				const { user_id, url, id } = message.message;

				// this is the number of retries
				const read_ct = message.read_ct;

				if (read_ct > MAX_RETRIES) {
					const lastError = message.message?.last_error as string | undefined;
					const archiveReason = lastError
						? `max_retries_exceeded: ${lastError}`
						: "max_retries_exceeded";

					Sentry.captureException(
						new Error(`AI enrichment failed after ${MAX_RETRIES} retries`),
						{
							tags: {
								operation: "ai_enrichment_archived",
								userId: user_id,
							},
							extra: {
								msg_id: message.msg_id,
								url,
								bookmarkId: id,
								read_ct,
								lastError,
								queueName: queue_name,
							},
						},
					);

					console.log(
						"[process-image-queue] archiving message from queue",
						message,
					);

					const { error: archiveError } = await supabase.rpc(
						"archive_with_reason",
						{
							p_queue_name: queue_name,
							p_msg_id: message.msg_id,
							p_reason: archiveReason,
						},
					);

					if (archiveError) {
						console.error(
							"[process-image-queue] Error archiving message from queue",
							archiveError,
						);
						Sentry.captureException(new Error("Queue archive failed"), {
							tags: {
								operation: "ai_enrichment_archive_failed",
							},
							extra: {
								msg_id: message.msg_id,
								archiveError,
							},
						});
					}

					continue;
				}

				const ogImage = message.message.ogImage;

				const mediaType = message?.message?.meta_data?.mediaType;

				const isTwitterBookmark = message.message.type === tweetType;

				const isInstagramBookmark = message.message.type === instagramType;

				const isRaindropBookmark =
					message.message.meta_data.is_raindrop_bookmark;

				if (ogImage) {
					// here we upload the image into R2 if it is a raindrop bookmark
					// and generate ocr imagecaption and bulhash for both twitter and raindrop bookmarks,
					// we are not awaiting, because we fire this api and vercel will handle the response

					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const response = axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${AI_ENRICHMENT_API}`,
						{
							id,
							url,
							user_id,
							isTwitterBookmark,
							ogImage,
							isRaindropBookmark,
							isInstagramBookmark,
							message,
							queue_name,
						},
					);
				} else {
					// here we take screenshot of the url for both twitter and raindrop bookmarks
					// we are not awaiting, because we fire this api and vercel will handle the response

					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const response_ = axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${WORKER_SCREENSHOT_API}`,
						{ id, url, user_id, mediaType, message, queue_name },
					);
				}
			} catch (error) {
				console.error(
					"[process-image-queue] Processing failed for message:",
					message,
					error,
				);
			}
		}

		// eslint-disable-next-line consistent-return
		return { messageId: messages[0]?.msg_id };
	} catch (error) {
		console.error("[process-image-queue] Queue processing error:", error);
		throw error;
	}
};
