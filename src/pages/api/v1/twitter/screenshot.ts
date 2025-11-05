import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { z } from "zod";

import imageToText from "../../../../async/ai/imageToText";
import ocr from "../../../../async/ai/ocr";
import { MAIN_TABLE_NAME, SCREENSHOT_API } from "../../../../utils/constants";
import { blurhashFromURL } from "../../../../utils/getBlurHash";
import { createServiceClient } from "../../../../utils/supabaseClient";
import { upload } from "../../bookmark/add-url-screenshot";

const ScreenshotPayloadSchema = z.object({
	id: z.union([z.string(), z.number()]),
	url: z.string().url("Invalid URL format"),
	user_id: z.string().min(1, "user_id is required"),
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

	const { id, url, user_id }: ScreenshotPayload = parsed.data;
	const supabase = createServiceClient();

	try {
		console.error(
			"######################## Screenshot Loading ########################",
		);

		const { data: screenshotData } = await axios.get(
			`${SCREENSHOT_API}try?url=${encodeURIComponent(url)}`,
			{ responseType: "json" },
		);

		if (screenshotData.status !== 200) {
			console.error("Screenshot error");
			Sentry.captureException(`Screenshot error`);
			response.status(500).json({ error: "Screenshot error" });
			return;
		}

		const base64data = Buffer.from(
			screenshotData?.screenshot?.data,
			"binary",
		).toString("base64");

		const { isPageScreenshot } = screenshotData?.data?.metaData || {};

		// Upload to R2
		const publicURL = await upload(base64data, user_id);

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
			response.status(500).json({ error: updateError });
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
			isPageScreenshot,
		};

		// ai-enrichment
		const caption = await imageToText(ogImage, supabase, user_id);
		if (caption) {
			newMeta.image_caption = caption;
		} else {
			console.error("imageToText returned empty result", url);
		}

		const ocrResult = await ocr(ogImage, supabase, user_id);
		if (ocrResult) {
			newMeta.ocr = ocrResult;
		} else {
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

		console.error(
			"######################## Screenshot Success ########################",
		);

		response.status(200).json({
			message: "Screenshot captured and uploaded successfully",
			image: publicURL,
			data: updatedData,
		});
		return;
	} catch (error) {
		console.error("Error in screenshot handler:", error);
		Sentry.captureException(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
