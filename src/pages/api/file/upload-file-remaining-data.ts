// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL, blurhashFromURL } from "../../../utils/getBlurHash";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = UploadFileApiResponse;

const notVideoLogic = async (
	publicUrl: string,
	mediaType: string | null,
	supabase: SupabaseClient,
	userId: string,
) => {
	const ogImage = publicUrl;
	let imageCaption = null;
	let imageOcrValue = null;

	if (ogImage) {
		try {
			// Get OCR using the centralized function
			imageOcrValue = await ocr(ogImage, supabase, userId);

			// Get image caption using the centralized function
			imageCaption = await imageToText(ogImage, supabase, userId);
		} catch (error) {
			console.warn("Gemini AI processing error", error);
		}
	}

	let imgData;

	if (publicUrl) {
		try {
			imgData = await blurhashFromURL(publicUrl);
		} catch (error) {
			console.warn("blurhashFromURL error", error);
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: imageCaption,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: imageOcrValue ?? null,
		coverImage: null,
		screenshot: null,
		isOgImagePreferred: false,
		iframeAllowed: false,
		mediaType,
		isPageScreenshot: null,
		video_url: null,
	};

	return { ogImage, meta_data };
};

export default async function handler(
	request: NextApiRequest<{
		id: SingleListData["id"];
		mediaType: ImgMetadataType["mediaType"];
		publicUrl: SingleListData["ogImage"];
	}>,
	response: NextApiResponse<Data>,
) {
	if (request.method !== "POST") {
		response
			.status(405)
			.json({ data: null, success: false, error: "Method Not Allowed" });
		return;
	}

	try {
		const { publicUrl, id, mediaType } = request.body;

		const supabase = apiSupabaseClient(request, response);

		// Check for auth errors
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response
				.status(401)
				.json({ data: null, success: false, error: "Unauthorized" });
			return;
		}

		// Entry point log
		console.log("upload-file-remaining-data API called:", {
			userId,
			id,
			publicUrl,
			mediaType,
		});

		let meta_data: ImgMetadataType = {
			img_caption: null,
			width: null,
			height: null,
			ogImgBlurUrl: null,
			favIcon: null,
			twitter_avatar_url: null,
			coverImage: null,
			screenshot: null,
			ocr: null,
			isOgImagePreferred: false,
			iframeAllowed: false,
			mediaType: "",
			isPageScreenshot: null,
			video_url: null,
		};

		const { meta_data: metaData } = await notVideoLogic(
			publicUrl,
			mediaType,
			supabase,
			userId,
		);

		// Fetch existing metadata
		const { data: existing, error: fetchError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("meta_data")
			.match({ id, user_id: userId })
			.single();

		if (fetchError) {
			console.error("Error fetching existing metadata:", fetchError);
			Sentry.captureException(fetchError, {
				tags: {
					operation: "fetch_existing_metadata",
					userId,
				},
				extra: {
					bookmarkId: id,
				},
			});
			response.status(500).json({
				data: null,
				success: false,
				error: "Error fetching existing metadata",
			});
			return;
		}

		const existingMeta = existing?.meta_data || {};

		// Merge: keep existing values if new ones are null/undefined
		const mergedMeta = {
			...existingMeta,
			...Object.fromEntries(
				Object.entries(metaData).map(([key, value]) => [
					key,
					value || existingMeta?.[key],
				]),
			),
		};

		meta_data = metaData;

		const { error: DBerror } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({
				ogImage: publicUrl,
				meta_data: mergedMeta,
				description: (meta_data?.img_caption as string) || "",
			})
			.match({ id, user_id: userId });

		if (DBerror) {
			console.error("Error updating file metadata:", DBerror);
			Sentry.captureException(DBerror, {
				tags: {
					operation: "update_file_metadata",
					userId,
				},
				extra: {
					bookmarkId: id,
				},
			});
			response.status(500).json({
				data: null,
				success: false,
				error: "Error updating file metadata",
			});
			return;
		}

		// Success
		console.log("File metadata updated successfully:", { bookmarkId: id });
		response.status(200).json({ data: null, success: true, error: null });
	} catch (error) {
		console.error("Unexpected error in upload-file-remaining-data:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "upload_file_remaining_data_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			success: false,
			error: "An unexpected error occurred",
		});
	}
}
