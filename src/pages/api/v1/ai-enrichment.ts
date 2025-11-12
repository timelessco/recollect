/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextApiRequest, type NextApiResponse } from "next";
import axios from "axios";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { createServiceClient } from "../../../utils/supabaseClient";
import { upload } from "../bookmark/add-remaining-bookmark-data";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	try {
		const {
			ogImage: ogImageUrl,
			user_id,
			url,
			isRaindropBookmark,
			message,
			queue_name,
		} = request.body;

		if (!ogImageUrl || !user_id || !url || !message) {
			response.status(400).json({ error: "Missing required fields" });
			return;
		}

		const supabase = createServiceClient();
		let ogImage = ogImageUrl;
		let isFailed = false;

		// If from Raindrop bookmark — upload image into R2
		if (isRaindropBookmark) {
			const image = await axios.get(ogImage, {
				responseType: "arraybuffer",
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "image/*,*/*;q=0.8",
				},
				timeout: 10_000,
			});

			const returnedB64 = Buffer.from(image.data).toString("base64");
			ogImage = await upload(returnedB64, user_id, null);
		}

		const newMeta: any = { ...message.message.meta_data };

		// Step 2: Caption generation
		const caption = await imageToText(ogImage, supabase, user_id);
		if (!caption) {
			console.error("imageToText returned empty result", url);
			isFailed = true;
		} else {
			newMeta.image_caption = caption;
		}

		// Step 3: OCR
		const ocrResult = await ocr(ogImage, supabase, user_id);
		if (!ocrResult) {
			console.error("ocr returned empty result", url);
			isFailed = true;
		} else {
			newMeta.ocr = ocrResult;
		}

		// Step 4: Blurhash
		const { width, height, encoded } = await blurhashFromURL(ogImage);
		if (!encoded || !width || !height) {
			console.error("blurhashFromURL returned empty result", url);
			isFailed = true;
		} else {
			newMeta.width = width;
			newMeta.height = height;
			newMeta.ogImgBlurUrl = encoded;
		}

		// Step 5: Update Supabase
		const { error } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ ogImage, meta_data: newMeta })
			.eq("url", url)
			.eq("user_id", user_id);

		if (error) {
			console.error("Error updating Supabase main table");
			isFailed = true;
		}

		// Delete message from queue
		if (!isFailed) {
			const { error: deleteError } = await supabase
				.schema("pgmq_public")
				.rpc("delete", {
					queue_name,
					message_id: message.msg_id,
				});

			if (deleteError) {
				console.error("Error deleting message from queue");
			}
		}

		response.status(200).json({
			success: true,
			isFailed,
			ogImage,
			meta_data: newMeta,
		});
	} catch (error: any) {
		console.error("Error in process-og-image:", error);
		response.status(500).json({
			error: error?.message || "Internal server error",
		});
	}
}
