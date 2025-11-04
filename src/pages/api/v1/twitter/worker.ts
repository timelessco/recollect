/* eslint-disable no-console */
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import imageToText from "../../../../async/ai/imageToText";
import ocr from "../../../../async/ai/ocr";
import { getBaseUrl, MAIN_TABLE_NAME } from "../../../../utils/constants";
import { blurhashFromURL } from "../../../../utils/getBlurHash";

type ProcessParameters = {
	batchSize: number;
	queueName: string;
};

const SLEEP_SECONDS = 30;
export const processImageQueue = async (
	supabase: SupabaseClient,
	parameters: ProcessParameters,
	processUntilEmpty = false,
) => {
	const { queueName, batchSize } = parameters;
	let totalBatches = 0;

	// while (true) {
	try {
		const { data: messages, error: messageError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: queueName,
				sleep_seconds: SLEEP_SECONDS,
				// eslint-disable-next-line id-length
				n: batchSize,
			});

		console.log(messages.length, "messages fetched");

		if (messages.length === 0) {
			return;
		}

		if (messageError) {
			console.error("Error fetching messages from queue:", messageError);
			return;
		}

		// If no messages, queue is empty - exit loop
		if (!messages?.length) {
			if (processUntilEmpty && totalBatches > 0) {
				console.log(`Queue empty after processing ${totalBatches} batches`);
			}

			return;
		}

		for (const message of messages) {
			console.log("Processing message:");

			let isFailed = false;

			try {
				const { user_id, ogImage, url } = message.message;

				if (ogImage) {
					// Your processing steps here
					const { data: existing } = await supabase
						.from(MAIN_TABLE_NAME)
						.select("meta_data")
						.eq("url", url)
						.eq("user_id", user_id)
						.single();

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const newMeta: any = { ...existing?.meta_data };

					const caption = await imageToText(ogImage, supabase, user_id);

					if (!caption) {
						console.error("imageToText returned empty result", url);
						isFailed = true;
					} else {
						newMeta.image_caption = caption;
					}

					const ocrResult = await ocr(ogImage, supabase, user_id);

					if (!ocrResult) {
						console.error("ocr returned empty result", url);
						isFailed = true;
					} else {
						newMeta.ocr = ocrResult;
					}

					const { width, height, encoded } = await blurhashFromURL(ogImage);

					if (!encoded || !width || !height) {
						console.error("blurhashFromURL returned empty result", url);
						isFailed = true;
					} else {
						newMeta.width = width;
						newMeta.height = height;
						newMeta.ogImgBlurUrl = encoded;
					}

					// Update the main table
					await supabase
						.from(MAIN_TABLE_NAME)
						.update({ meta_data: newMeta })
						.eq("url", url)
						.eq("user_id", user_id);
				}

				// Delete message from queue
				if (!isFailed) {
					const { error: deleteError } = await supabase
						.schema("pgmq_public")
						.rpc("delete", {
							queue_name: queueName,
							message_id: message.msg_id,
						});

					if (deleteError)
						console.error("Error deleting message:", deleteError);
				}
			} catch (error) {
				console.error("Processing failed for message:", message.msg_id, error);
			}
		}

		totalBatches++;

		// If not processing until empty, exit after first batch
		if (!processUntilEmpty) {
			// eslint-disable-next-line consistent-return
			return {
				messageId: messages[0]?.msg_id,
				messageEndId: messages[messages.length - 1]?.msg_id,
			};
		}
	} catch (error) {
		console.error("Queue processing error:", error);
		throw error;
	}

	const apiUrl = `${getBaseUrl()}/api/v1/twitter/process-queue`;

	const response_ = axios.get(apiUrl);
	// }
};
