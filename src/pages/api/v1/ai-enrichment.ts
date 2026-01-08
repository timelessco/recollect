import { type NextApiRequest, type NextApiResponse } from "next";
import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { uploadVideoToR2 } from "../../../utils/helpers";
import { createServiceClient } from "../../../utils/supabaseClient";
import { upload } from "../bookmark/add-remaining-bookmark-data";

type EnrichMetadataParams = {
	existingMetadata: Record<string, unknown>;
	ogImage: string;
	isTwitterBookmark: boolean;
	videoUrl?: string | null;
	userId: string;
	supabase: SupabaseClient;
	url: string;
};

type EnrichMetadataResult = {
	metadata: Record<string, unknown>;
	isFailed: boolean;
};

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
			meta_data: z.object({
				twitter_avatar_url: z.string().optional(),
				instagram_username: z.string().max(30).optional(),
				instagram_profile_pic: z.string().nullable().optional(),
				favIcon: z.string(),
				video_url: z.string().nullable().optional(),
				saved_collection_names: z
					.array(z.string().max(255))
					.max(100)
					.optional(),
			}),
		}),
	}),
	queue_name: z.string().min(1, { message: "queue_name is required" }),
});

/**
 * Enrich bookmark metadata with AI-generated content.
 *
 * Performs the following enrichments:
 * - Twitter video upload to R2 (if applicable)
 * - Image caption generation via AI
 * - OCR text extraction from image
 * - Blurhash generation for progressive image loading
 * @param params - Enrichment parameters
 * @param params.existingMetadata - The existing bookmark metadata
 * @param params.ogImage - The Open Graph image URL to process
 * @param params.isTwitterBookmark - Whether this is a Twitter bookmark
 * @param params.videoUrl - Optional Twitter video URL to upload to R2
 * @param params.userId - The user ID for R2 upload path
 * @param params.supabase - Supabase client for AI operations
 * @param params.url - The bookmark URL for logging
 * @returns Updated metadata and failure flag
 */
async function enrichMetadata({
	existingMetadata,
	ogImage,
	isTwitterBookmark,
	videoUrl,
	userId,
	supabase,
	url,
}: EnrichMetadataParams): Promise<EnrichMetadataResult> {
	const metadata = { ...existingMetadata };
	let isFailed = false;

	// Upload Twitter video to R2
	if (isTwitterBookmark && videoUrl && typeof videoUrl === "string") {
		const r2VideoUrl = await uploadVideoToR2(videoUrl, userId);

		if (r2VideoUrl) {
			metadata.video_url = r2VideoUrl;
			console.log(`Twitter video uploaded to R2: ${r2VideoUrl}`);
		} else {
			// Upload failed but not critical - keep processing
			metadata.video_url = videoUrl;
			console.warn("Video upload failed, using original URL");
		}
	}

	// Generate caption for the image
	const caption = await imageToText(ogImage, supabase, userId);
	if (!caption) {
		console.error("imageToText returned empty result", url);
		isFailed = true;
	} else {
		metadata.image_caption = caption;
	}

	// Extract text from the image
	const ocrResult = await ocr(ogImage, supabase, userId);
	if (!ocrResult) {
		console.error("ocr returned empty result", url);
		isFailed = true;
	} else {
		metadata.ocr = ocrResult;
	}

	// Generate blurhash for the image
	const { width, height, encoded } = await blurhashFromURL(ogImage);
	if (!encoded || !width || !height) {
		console.error("blurhashFromURL returned empty result", url);
		isFailed = true;
	} else {
		metadata.width = width;
		metadata.height = height;
		metadata.ogImgBlurUrl = encoded;
	}

	return { metadata, isFailed };
}

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

		// If from Raindrop bookmark — upload ogImage into R2
		if (isRaindropBookmark) {
			try {
				const imageResponse = await fetch(ogImage, {
					headers: {
						"User-Agent": "Mozilla/5.0",
						Accept: "image/*,*/*;q=0.8",
					},
					signal: AbortSignal.timeout(10_000),
				});

				if (!imageResponse.ok) {
					throw new Error(`HTTP error! status: ${imageResponse.status}`);
				}

				const arrayBuffer = await imageResponse.arrayBuffer();
				const returnedB64 = Buffer.from(arrayBuffer).toString("base64");
				ogImage = (await upload(returnedB64, user_id, null)) || ogImageUrl;
			} catch (error) {
				console.error("Error downloading Raindrop image:", error);
			}
		}

		// Enrich metadata with AI-generated content
		const { metadata: newMeta, isFailed } = await enrichMetadata({
			existingMetadata: message.message.meta_data,
			ogImage,
			isTwitterBookmark,
			videoUrl: message.message.meta_data?.video_url,
			userId: user_id,
			supabase,
			url,
		});

		// Update database with enriched data
		const { error } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ ogImage, meta_data: newMeta })
			.eq("url", url)
			.eq("user_id", user_id);

		if (error) {
			console.error("Error updating Supabase main table");
		}

		// Delete message from queue on success
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
	} catch (error) {
		console.error("Error in process-og-image:", error);
		response.status(500).json({
			error: error instanceof Error ? error.message : "Internal server error",
		});
	}
}
