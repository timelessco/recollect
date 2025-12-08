import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import imageToText from "../../../../../../async/ai/imageToText";
import ocr from "../../../../../../async/ai/ocr";
import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../../../utils/constants";
import { blurhashFromURL } from "../../../../../../utils/getBlurHash";
import { apiSupabaseServiceClient } from "../../../../../../utils/supabaseServerClient";

type RequestBodyType = {
	id: SingleListData["id"];
	mediaType: ImgMetadataType["mediaType"];
	publicUrl: SingleListData["ogImage"];
};

/**
 * Processes non-video files: generates blurhash, OCR, and image captions
 */
const notVideoLogic = async (
	publicUrl: string,
	mediaType: string | null,
	supabase: SupabaseClient,
	fileId: number,
) => {
	const ogImage = publicUrl;
	let imageCaption = null;
	let imageOcrValue = null;

	if (ogImage) {
		// Handle OCR processing
		try {
			// For internal API calls, we need to get the userId from the file record
			const { data: fileRecord } = await supabase
				.from(MAIN_TABLE_NAME)
				.select("user_id")
				.eq("id", fileId)
				.single();

			const userId = fileRecord?.user_id;

			if (userId) {
				imageOcrValue = await ocr(ogImage, supabase, userId);
			}
		} catch (error) {
			console.error("OCR processing failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "ocr_processing",
				},
				extra: {
					publicUrl: ogImage,
					fileId,
				},
			});
		}

		// Handle image caption generation
		try {
			// For internal API calls, we need to get the userId from the file record
			const { data: fileRecord } = await supabase
				.from(MAIN_TABLE_NAME)
				.select("user_id")
				.eq("id", fileId)
				.single();

			const userId = fileRecord?.user_id;

			if (userId) {
				imageCaption = await imageToText(ogImage, supabase, userId);
			}
		} catch (error) {
			console.error("Image caption generation failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "image_caption_generation",
				},
				extra: {
					publicUrl: ogImage,
					fileId,
				},
			});
		}
	}

	let imgData;

	if (publicUrl) {
		// Handle blurhash generation
		try {
			imgData = await blurhashFromURL(publicUrl);
		} catch (error) {
			console.error("Blurhash generation failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "blurhash_generation",
				},
				extra: {
					publicUrl,
					fileId,
				},
			});
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

/**
 * /api/v1/file/upload/tasks/remaining:
 *   post:
 *     summary: Process remaining file metadata
 *     description: Generates additional metadata for uploaded files (blurhash, OCR, image captions) and updates the database.
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - publicUrl
 *             properties:
 *               id:
 *                 type: number
 *                 description: File/bookmark ID
 *               publicUrl:
 *                 type: string
 *                 description: Public URL of the uploaded file
 *               mediaType:
 *                 type: string
 *                 nullable: true
 *                 description: Media type of the file
 *     responses:
 *       200:
 *         description: File metadata processed successfully
 *       401:
 *         description: Unauthorized
 *       405:
 *         description: Method not allowed
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<RequestBodyType>,
	response: NextApiResponse<UploadFileApiResponse>,
) {
	try {
		// Validate request method
		if (request.method !== "POST") {
			response.status(405).json({
				data: null,
				success: false,
				error: "Method Not Allowed",
			});
			return;
		}

		// Authenticate internal API key
		const apiKey =
			request.headers["x-api-key"] ||
			request.headers.authorization?.replace("Bearer ", "");

		if (apiKey !== process.env.INTERNAL_API_KEY) {
			console.warn("Unauthorized - Invalid API key");
			response.status(401).json({
				data: null,
				success: false,
				error: "Unauthorized",
			});
			return;
		}

		const { publicUrl, id, mediaType } = request.body;

		const supabase = apiSupabaseServiceClient();

		// Entry point log
		console.log("upload-file-remaining-data API called:", {
			id,
			publicUrl,
			mediaType,
		});

		// Process file metadata (blurhash, OCR, image caption)
		const { meta_data: metaData } = await notVideoLogic(
			publicUrl,
			mediaType,
			supabase,
			id,
		);

		console.log("Metadata processing completed:", {
			bookmarkId: id,
			hasImageCaption: Boolean(metaData.img_caption),
			hasOcr: Boolean(metaData.ocr),
			hasBlurhash: Boolean(metaData.ogImgBlurUrl),
		});

		// Fetch existing metadata
		const { data: existing, error: fetchError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("meta_data")
			.eq("id", id)
			.single();

		// Check for fetch error immediately
		if (fetchError) {
			console.error("Error fetching existing metadata:", fetchError);
			Sentry.captureException(fetchError, {
				tags: {
					operation: "fetch_existing_metadata",
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

		console.log("Existing metadata fetched successfully:", {
			bookmarkId: id,
		});

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

		// Update database with merged metadata
		const { error: updateError } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({
				ogImage: publicUrl,
				meta_data: mergedMeta,
				description: (metaData?.img_caption as string) || "",
			})
			.eq("id", id);

		// Check for update error immediately
		if (updateError) {
			console.error("Error updating file metadata:", updateError);
			Sentry.captureException(updateError, {
				tags: {
					operation: "update_file_metadata",
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
		response.status(200).json({
			data: null,
			success: true,
			error: null,
		});
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
