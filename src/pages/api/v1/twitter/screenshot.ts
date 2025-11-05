import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import {
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	SCREENSHOT_API,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../../utils/constants";
import { r2Helpers } from "../../../../utils/r2Client";
import { createServiceClient } from "../../../../utils/supabaseClient";

type ScreenshotPayload = {
	id: number | string;
	url: string;
	user_id: string;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const { id, url, user_id }: ScreenshotPayload = request.body;

	if (!id || !url || !user_id) {
		response
			.status(400)
			.json({ error: "Missing required fields: id, url, or user_id" });
		return;
	}

	const supabase = createServiceClient();

	try {
		console.error(
			"######################## Screenshot Loading ########################",
		);
		const { data: screenshotData } = await axios.get(
			`${SCREENSHOT_API}try?url=${encodeURIComponent(url)}`,
			{ responseType: "json" },
		);

		const base64data = Buffer.from(
			screenshotData?.screenshot?.data,
			"binary",
		).toString("base64");

		// Upload to R2
		const imgName = `img-${uniqid.time()}.jpg`;
		const storagePath = `${STORAGE_SCREENSHOT_IMAGES_PATH}/${user_id}/${imgName}`;

		const { error: uploadError } = await r2Helpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath,
			new Uint8Array(decode(base64data)),
			"image/jpg",
		);

		if (uploadError) {
			console.error(" R2 upload failed:", uploadError);
			Sentry.captureException(uploadError);
			response.status(500).json({ error: "Upload failed" });
			return;
		}

		const { data: publicUrlData } = r2Helpers.getPublicUrl(storagePath);
		const publicURL = publicUrlData?.publicUrl;

		// Update DB
		const { data: updatedData, error: updateError } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ ogImage: publicURL })
			.eq("id", id)
			.eq("user_id", user_id)
			.select();

		if (updateError) {
			console.error(" Error updating bookmark:", updateError);
			Sentry.captureException(updateError);
			response.status(500).json({ error: updateError });
			return;
		}

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
