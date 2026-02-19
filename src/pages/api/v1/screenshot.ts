import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { z } from "zod";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	MAIN_TABLE_NAME,
	PDF_MIME_TYPE,
	SCREENSHOT_API,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { uploadVideoToR2 } from "../../../utils/helpers.server";
import { createServiceClient } from "../../../utils/supabaseClient";

import { upload } from "@/lib/storage/media-upload";

const ScreenshotPayloadSchema = z.object({
	id: z.union([z.string(), z.number()]),
	url: z.string().url("Invalid URL format"),
	user_id: z.string().min(1, "user_id is required"),
	mediaType: z.string().nullable().optional(),
	queue_name: z.string(),
	message: z.object({
		msg_id: z.number(),
	}),
	video_url: z.string().url().nullable().optional(),
	isTwitterBookmark: z.boolean().optional(),
	isInstagramBookmark: z.boolean().optional(),
});

type ScreenshotPayload = z.infer<typeof ScreenshotPayloadSchema>;

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const parsed = ScreenshotPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		const errors = parsed.error.flatten().fieldErrors;
		response.status(400).json({ error: "Invalid input", details: errors });
		return;
	}

	const {
		id,
		url,
		user_id,
		mediaType,
		queue_name,
		message,
		video_url: videoUrl,
		isTwitterBookmark,
		isInstagramBookmark,
	}: ScreenshotPayload = parsed.data;

	const supabase = createServiceClient();

	try {
		let publicURL;

		let isPageScreenshot = false;

		let isFailed = false;

		if (mediaType && mediaType === PDF_MIME_TYPE) {
			console.log(
				"######################## Generating PDF Thumbnail ########################",
			);
			try {
				const { data } = await axios.post(
					process.env.PDF_URL_SCREENSHOT_API,
					{
						url,
						userId: user_id,
					},
					{
						headers: {
							Authorization: `Bearer ${process.env.PDF_SECRET_KEY}`,
							"Content-Type": "application/json",
						},
					},
				);

				publicURL = data?.publicUrl;
			} catch {
				isFailed = true;
				throw new Error("Failed to generate PDF thumbnail in worker");
			}
		} else {
			console.log(
				"######################## Screenshot Loading ########################",
			);
			try {
				const { data: screenshotData } = await axios.get(
					`${SCREENSHOT_API}/try?url=${encodeURIComponent(url)}`,
					{ responseType: "json" },
				);

				const base64data = Buffer.from(
					screenshotData?.screenshot?.data,
					"binary",
				).toString("base64");

				isPageScreenshot = screenshotData?.metaData?.isPageScreenshot || {};

				// Upload to R2
				publicURL = await upload(base64data, user_id);
			} catch {
				isFailed = true;
				throw new Error("Failed to take screenshot in worker");
			}
		}

		// Update DB with ogImage
		const { data: updatedData, error: updateError } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ ogImage: publicURL })
			.eq("id", id)
			.eq("user_id", user_id)
			.select();

		if (updateError) {
			console.error("Error updating bookmark:", updateError);
			Sentry.captureException(updateError);
			response.status(500).json({ error: "Error updating bookmark" });
			return;
		}

		const ogImage = updatedData?.[0]?.ogImage;

		// Get existing metadata
		const { data: existing } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("meta_data")
			.eq("url", url)
			.eq("user_id", user_id)
			.single();

		const newMeta: Record<string, unknown> = {
			...existing?.meta_data,
			mediaType,
			isPageScreenshot,
		};

		// Video upload - uploadVideoToR2 validates domain for Twitter/Instagram
		// When video_url is null (inaccessible), persist null to overwrite stale URL
		if (videoUrl === null) {
			newMeta.video_url = null;
		} else if (videoUrl) {
			const r2VideoUrl = await uploadVideoToR2(
				videoUrl,
				user_id,
				Boolean(isTwitterBookmark),
				Boolean(isInstagramBookmark),
			);
			newMeta.video_url = r2VideoUrl ?? videoUrl;
		}

		// ai-enrichment
		const imageToTextResult = await imageToText(ogImage, supabase, user_id, {
			isPageScreenshot: Boolean(isPageScreenshot),
		});
		if (imageToTextResult) {
			newMeta.image_caption = imageToTextResult.sentence;
			if (imageToTextResult.image_keywords?.length) {
				newMeta.image_keywords = imageToTextResult.image_keywords;
			}
		} else {
			console.warn(
				"imageToText returned empty result (quota may be reached)",
				url,
			);
		}

		// OCR returns { text, status } object
		const ocrResult = await ocr(ogImage, supabase, user_id);

		if (ocrResult.text) {
			newMeta.ocr = ocrResult.text;
			newMeta.ocr_status = ocrResult.status;
		} else {
			newMeta.ocr = null;
			newMeta.ocr_status = ocrResult.status;
			console.error("ocr returned empty result", url);
		}

		const { width, height, encoded } = await blurhashFromURL(ogImage);
		if (encoded && width && height) {
			Object.assign(newMeta, {
				width,
				height,
				ogImgBlurUrl: encoded,
			});
		} else {
			console.error("blurhashFromURL returned empty result", url);
		}

		// Update metadata in DB
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ meta_data: newMeta })
			.eq("url", url)
			.eq("user_id", user_id);

		console.log(
			`######################## ${mediaType && mediaType === PDF_MIME_TYPE ? "PDF Thumbnail Generated" : "Screenshot Success"} ########################`,
		);

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
			message: "Screenshot captured and uploaded successfully",
			image: publicURL,
			data: updatedData,
		});
	} catch (error) {
		console.error("Error in screenshot handler:", error);
		Sentry.captureException(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
