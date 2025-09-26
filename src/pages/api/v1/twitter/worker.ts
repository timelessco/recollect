import { type SupabaseClient } from "@supabase/supabase-js";

import imageToText from "../../../../async/ai/imageToText";
import ocr from "../../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { blurhashFromURL } from "../../../../utils/getBlurHash";

type ProcessParameters = {
	batchSize?: number;
	processBlurhash?: boolean;
	processCaption?: boolean;
	processOcr?: boolean;
	queueName: string;
	sleepSeconds?: number;
};

export const processImageQueue = async (
	supabase: SupabaseClient,
	parameters: ProcessParameters,
) => {
	const SLEEP_SECONDS = 10;

	const { processOcr, processCaption, processBlurhash, queueName, batchSize } =
		parameters;

	try {
		const { data: messages, error: messageError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: queueName,
				sleep_seconds: SLEEP_SECONDS,
				// eslint-disable-next-line id-length
				n: batchSize,
			});

		if (messageError) {
			console.error("Error fetching messages from queue:", messageError);
			return;
		}

		if (!messages?.length) return;

		for (const message of messages) {
			let isFailed = false;

			try {
				const { ogImage, url } = message.message;

				if (ogImage) {
					const { data: existing } = await supabase
						.from(MAIN_TABLE_NAME)
						.select("meta_data")
						.eq("url", url)
						.single();

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const newMeta: any = { ...existing?.meta_data };

					// Process image based on parameters
					if (processCaption) {
						try {
							newMeta.image_caption = await imageToText(ogImage);
						} catch {
							console.error("Error processing image caption");
							isFailed = true;
						}
					}

					if (processOcr) {
						try {
							newMeta.ocr = await ocr(ogImage);
						} catch {
							console.error("Error processing OCR");
							isFailed = true;
						}
					}

					if (processBlurhash) {
						try {
							const { width, height, encoded } = await blurhashFromURL(ogImage);
							newMeta.width = width;
							newMeta.height = height;
							newMeta.ogImgBlurUrl = encoded;
						} catch {
							console.error("Error processing blurhash");
							isFailed = true;
						}
					}

					// Update the main table
					await supabase
						.from(MAIN_TABLE_NAME)
						.update({ meta_data: newMeta })
						.eq("url", url);
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

		// eslint-disable-next-line consistent-return
		return {
			messageId: messages[0]?.msg_id,
			messageEndId: messages[messages.length - 1]?.msg_id,
		};
	} catch (error) {
		console.error("Queue processing error:", error);
		throw error;
	}
};
