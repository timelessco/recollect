/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import uniqid from "uniqid";
import { z } from "zod";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { storageHelpers } from "../../../utils/storageClient";
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

/**
 * Downloads a video from external URL and uploads to R2
 * @param videoUrl - External video URL (e.g. Twitter CDN)
 * @param user_id - User ID for storage path
 * @returns R2 public URL or null if failed
 */
const uploadVideoToR2 = async (
	videoUrl: string,
	user_id: string,
): Promise<string | null> => {
	try {
		// Download video with appropriate headers
		const videoResponse = await axios.get(videoUrl, {
			responseType: "arraybuffer",
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; RecollectBot/1.0)",
				Accept: "video/*,*/*;q=0.8",
			},
			// 60 seconds for large videos
			timeout: 60_000,
			// 50MB limit
			maxContentLength: 50 * 1024 * 1024,
		});

		// Generate unique filename
		const videoName = `twitter-video-${uniqid.time()}.mp4`;
		const storagePath = `${STORAGE_FILES_PATH}/${user_id}/${videoName}`;

		// Determine content type from response or default to mp4
		const contentType = videoResponse.headers["content-type"] || "video/mp4";

		// Upload to R2
		const videoBuffer = Buffer.from(videoResponse.data);
		const { error: uploadError } = await storageHelpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath,
			videoBuffer,
			contentType,
		);

		if (uploadError) {
			Sentry.captureException(uploadError, {
				tags: { operation: "twitter_video_upload" },
				extra: { videoUrl, userId: user_id },
			});
			console.error("R2 video upload failed:", uploadError);
			return null;
		}

		// Get public URL
		const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

		console.log(`Video uploaded successfully to: ${storageData?.publicUrl}`);
		return storageData?.publicUrl || null;
	} catch (error: any) {
		// Handle specific error cases
		if (error.code === "ECONNABORTED") {
			console.error("Video download timeout:", error);
		} else if (error.response?.status === 403) {
			console.error("Video URL access forbidden (may be expired):", error);
		} else {
			console.error("Error in uploadVideoToR2:", error);
		}

		Sentry.captureException(error, {
			tags: { operation: "twitter_video_download" },
			extra: { videoUrl, userId: user_id },
		});

		return null;
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
			console.log(
				`Processing Twitter bookmark: ${JSON.stringify(message.message.meta_data)}`,
			);

			const videoUrl = message.message.meta_data?.video_url;

			if (videoUrl && typeof videoUrl === "string") {
				console.log(`Processing Twitter video: ${videoUrl}`);

				try {
					const r2VideoUrl = await uploadVideoToR2(videoUrl, user_id);

					if (r2VideoUrl) {
						// Replace external URL with R2 URL
						newMeta.video_url = r2VideoUrl;
						console.log(`Twitter video uploaded to R2: ${r2VideoUrl}`);
					} else {
						// Upload failed but not critical - keep processing
						newMeta.video_url = videoUrl;
						console.warn("Video upload failed, using original URL");
					}
				} catch (error) {
					// Non-blocking error - continue with other processing
					console.error("Twitter video processing error:", error);
					// Fallback to original
					newMeta.video_url = videoUrl;
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
