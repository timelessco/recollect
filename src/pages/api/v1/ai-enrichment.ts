/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextApiRequest, type NextApiResponse } from "next";
import axios from "axios";
import { z } from "zod";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { uploadVideoToR2 } from "../../../utils/helpers";
import { createServiceClient } from "../../../utils/supabaseClient";
import { upload } from "../bookmark/add-remaining-bookmark-data";

const requestBodySchema = z.object({
	id: z.number(),
	ogImage: z.url({ message: "ogImage must be a valid URL" }),
	user_id: z.uuid({ message: "user_id must be a valid UUID" }),
	url: z.url({ message: "url must be a valid URL" }),
	isRaindropBookmark: z.boolean().optional().default(false),
	isTwitterBookmark: z.boolean().optional().default(false),
	message: z.object({
		msg_id: z.number(),
		message: z.object({
			meta_data: z.record(z.string(), z.any()).optional().default({}),
		}),
	}),
	queue_name: z.string().min(1, { message: "queue_name is required" }),
});

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	try {
		const parseResult = requestBodySchema.safeParse(request.body);

		if (!parseResult.success) {
			console.warn("Validation error:", parseResult.error.issues);
			response.status(400).json({
				error: "Validation failed",
			});
			return;
		}

		const {
			ogImage: ogImageUrl,
			user_id,
			url,
			isRaindropBookmark,
			isTwitterBookmark,
			message,
			queue_name,
		} = parseResult.data;

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
			ogImage = (await upload(returnedB64, user_id, null)) || ogImageUrl;
		}

		const newMeta: any = { ...message.message.meta_data };
		// If from Twitter bookmark — upload video into R2
		if (isTwitterBookmark) {
			const videoUrl = message.message.meta_data?.video_url;

			if (videoUrl && typeof videoUrl === "string") {
				const r2VideoUrl = await uploadVideoToR2(videoUrl, user_id);

				if (r2VideoUrl) {
					newMeta.video_url = r2VideoUrl;
					console.log(`Twitter video uploaded to R2: ${r2VideoUrl}`);
				} else {
					// Upload failed but not critical - keep processing
					newMeta.video_url = videoUrl;
					console.warn("Video upload failed, using original URL");
				}
			}
		}

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
