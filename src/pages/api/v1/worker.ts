import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import {
	AI_ENRICHMENT_API,
	getBaseUrl,
	NEXT_API_URL,
	WORKER_SCREENSHOT_API,
} from "../../../utils/constants";

type ProcessParameters = { batchSize: number; queue_name: string };

const SLEEP_SECONDS = 30;
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

		if (messages.length === 0) {
			return;
		}

		if (messageError) {
			console.error("Error fetching messages from queue:", messageError);
			return;
		}

		if (!messages?.length) {
			return;
		}

		for (const message of messages) {
			try {
				const { user_id, url, id } = message.message;

				const ogImage = message.message.ogImage;

				const mediaType = message?.message?.meta_data?.mediaType;

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
							ogImage,
							isRaindropBookmark,
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
				console.error("Processing failed for message:", message.msg_id, error);
			}
		}

		// eslint-disable-next-line consistent-return
		return { messageId: messages[0]?.msg_id };
	} catch (error) {
		console.error("Queue processing error:", error);
		throw error;
	}
};
