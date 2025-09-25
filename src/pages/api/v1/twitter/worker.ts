/* eslint-disable no-console */
import { type NextApiRequest, type NextApiResponse } from "next";

import ocr from "../../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { createServiceClient } from "../../../../utils/supabaseClient";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const processImageQueue = async (supabase: any) => {
	try {
		const { data: messages, error: messageError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: "ai-stuffs",
				sleep_seconds: 300,
				// eslint-disable-next-line id-length
				n: 1,
			});

		if (!messages?.length) {
			return;
		}

		if (messageError) {
			console.error("Error fetching messages from queue:", messageError);
			return;
		}

		for (const message of messages || []) {
			try {
				const { ogImage, url, meta_data } = message.message;

				const { data: existing } = await supabase
					.from(MAIN_TABLE_NAME)
					.select("meta_data")
					.eq("url", url)
					.single();
				// Process the image (your heavy operations)
				if (ogImage) {
					// const imgData = await blurhashFromURL(ogImage);
					const imageOcrValue = await ocr(ogImage);
					// const image_caption = await imageToText(ogImage);
					console.log("existing", existing);

					console.log("imageOcrValue", imageOcrValue);

					const newMeta = {
						...existing?.meta_data,
						ocr: imageOcrValue,
					};
					console.log("newMeta", newMeta);

					// UPDATE THE MAIN TABLE
					await supabase
						.from(MAIN_TABLE_NAME)
						.update({
							meta_data: {
								...newMeta,
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
		return { messageId: messages?.[0]?.msg_id };
	} catch (error) {
		console.error("Queue processing error:", error);
		throw error;
	}
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const supabase = createServiceClient();
	try {
		const result = await processImageQueue(supabase);

		console.log({
			message: "Queue processed successfully",
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
