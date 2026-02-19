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
import { getValidatedVideoUrl } from "./helpers.server";

type ProcessParameters = { batchSize: number; queue_name: string };

const SLEEP_SECONDS = 30;

// max retries for a message
const MAX_RETRIES = 3;

const OG_IMAGE_VALIDATION_TIMEOUT_MS = 5_000;

/**
 * Checks if an ogImage URL is accessible via HEAD request.
 * Returns false on timeout, 4xx/5xx, or network errors.
 */
async function isOgImageAccessible(ogImageUrl: string): Promise<boolean> {
	try {
		const response = await fetch(ogImageUrl, {
			method: "HEAD",
			signal: AbortSignal.timeout(OG_IMAGE_VALIDATION_TIMEOUT_MS),
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; Recollect/1.0; +https://recollect.so)",
			},
		});
		return response.ok;
	} catch {
		return false;
	}
}

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
					console.log(
						"[process-image-queue] archiving message from queue",
						message,
					);

					const { error: deleteError } = await supabase
						.schema("pgmq_public")
						.rpc("archive", {
							queue_name,
							message_id: message.msg_id,
						});

					if (deleteError) {
						console.error(
							"[process-image-queue] Error archiving message from queue",
							deleteError,
						);
					}

					continue;
				}

				const ogImage = message.message.ogImage;

				const mediaType = message?.message?.meta_data?.mediaType;

				const isTwitterBookmark = message.message.type === tweetType;

				const isInstagramBookmark = message.message.type === instagramType;

				const isRaindropBookmark =
					message.message.meta_data?.is_raindrop_bookmark;

				// When ogImage exists, validate URL before routing
				let useOgImage = Boolean(ogImage);
				if (ogImage) {
					useOgImage = await isOgImageAccessible(ogImage);
					if (!useOgImage) {
						console.log(
							"[process-image-queue] ogImage URL inaccessible, falling back to screenshot",
							{ url, ogImage },
						);
					}
				}

				if (useOgImage) {
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

					const rawVideoUrl = message.message.meta_data?.video_url;
					const validatedVideoUrl = await getValidatedVideoUrl(rawVideoUrl);

					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const response_ = axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${WORKER_SCREENSHOT_API}`,
						{
							id,
							url,
							user_id,
							mediaType,
							message,
							queue_name,
							video_url: validatedVideoUrl,
							isTwitterBookmark,
							isInstagramBookmark,
						},
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
