// pages/api/process-queue.js (Pages Router)

import { type NextApiRequest, type NextApiResponse } from "next";

import imageToText from "../../../../async/ai/imageToText";
import ocr from "../../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { blurhashFromURL } from "../../../../utils/getBlurHash";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processImageQueue = async (supabase: any) => {
	try {
		let totalMessages = 0;
		const { data: messages, error: messageError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: "ai-stuffs",
				sleep_seconds: 10,
				// eslint-disable-next-line id-length
				n: 2,
			});

		// eslint-disable-next-line no-console
		console.log(
			"************************ messages *********************",
			messages?.length,
		);

		totalMessages = messages?.length;

		if (messageError) {
			console.error("Error fetching messages from queue:", messageError);
			return;
		}

		for (const message of messages || []) {
			try {
				const { ogImage, url, meta_data } = message.message;

				// Process the image (your heavy operations)
				if (ogImage) {
					const imgData = await blurhashFromURL(ogImage);
					const imageOcrValue = await ocr(ogImage);
					const image_caption = await imageToText(ogImage);

					// UPDATE THE MAIN TABLE
					await supabase
						.from(MAIN_TABLE_NAME)
						.update({
							meta_data: {
								height: imgData?.height,
								width: imgData?.width,
								ogImgBlurUrl: imgData?.encoded,
								image_caption,
								ocr: imageOcrValue,
								...meta_data,
							},
						})
						.eq("url", url);
				}

				// Delete message from queue (mark as processed)
				const { error: deleteError } = await supabase
					.schema("pgmq_public")
					.rpc("delete", {
						queue_name: "ai-stuffs",
						message_id: message.msg_id,
					});

				if (deleteError) {
					console.error("Error deleting message from queue:", deleteError);
				}
			} catch (error) {
				console.error("Processing failed:", error);
			}
		}

		// eslint-disable-next-line consistent-return
		return { totalMessages, messageId: messages?.[0]?.msg_id };
	} catch (error) {
		console.error("Queue processing error:", error);
		throw error;
	}
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const supabase = apiSupabaseClient(request, response);

	try {
		const result = await processImageQueue(supabase);

		// eslint-disable-next-line no-console
		console.log({
			message: "Queue processed successfully",
			count: result?.totalMessages,
			messageId: result?.messageId,
		});

		response.status(200).json({
			success: true,
			message: "Queue processed successfully",
		});
	} catch {
		response.status(500).json({
			success: false,
			error: "Error processing queue",
		});
	}
}
