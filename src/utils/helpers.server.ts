import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import imageToText from "@/async/ai/imageToText";
import ocr from "@/async/ai/ocr";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { uploadVideoToR2 } from "@/utils/helpers";

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

// this function cannot be exported from helper.ts because it uses processBlurhash functions,
// in processBlurhash, blurhashFromURL is used which uses sharp , which is not supported in the browser
// Client-side dashboard components import functions from helpers.ts
// Webpack tries to bundle the entire helpers.ts file for the browser, including sharp, which fails
export const enrichMetadata = async ({
	existingMetadata,
	ogImage,
	isTwitterBookmark,
	videoUrl,
	userId,
	supabase,
	url,
}: EnrichMetadataParams): Promise<EnrichMetadataResult> => {
	let video_url = null;

	// Upload Twitter video to R2
	if (isTwitterBookmark && videoUrl && typeof videoUrl === "string") {
		console.log("[enrichMetadata] Uploading Twitter video to R2:", { url });
		const r2VideoUrl = await uploadVideoToR2(videoUrl, userId);

		if (r2VideoUrl) {
			video_url = r2VideoUrl;
			console.log("[enrichMetadata] Twitter video uploaded to R2:", {
				url,
				r2VideoUrl,
			});
		} else {
			// Upload failed but not critical - keep processing
			video_url = videoUrl;
			console.warn(
				"[enrichMetadata] Video upload failed, using original URL:",
				{
					url,
					videoUrl,
				},
			);
		}
	}

	const { isOcrFailed, ocrResult } = await processOcr(
		ogImage,
		supabase,
		userId,
		url,
	);

	const { isImageCaptionFailed, image_caption } = await processImageCaption(
		ogImage,
		supabase,
		userId,
		url,
	);

	const { isBlurhashFailed, blurhash } = await processBlurhash(ogImage, url);

	const metadata = {
		...existingMetadata,
		ocr: ocrResult,
		image_caption,
		width: blurhash?.width,
		height: blurhash?.height,
		ogImgBlurUrl: blurhash?.encoded,
		video_url,
	};

	const isFailed = isOcrFailed || isImageCaptionFailed || isBlurhashFailed;

	console.log("[enrichMetadata] Enrichment completed:", {
		url,
		isFailed,
		hasImageCaption: Boolean(metadata.image_caption),
		hasOcr: Boolean(metadata.ocr),
		hasBlurhash: Boolean(metadata.ogImgBlurUrl),
		hasVideo: Boolean(metadata.video_url),
	});

	return { metadata, isFailed };
};

const processOcr = async (
	ogImage: string,
	supabase: SupabaseClient,
	userId: string,
	url: string,
) => {
	console.log("[processOcr] Extracting text via OCR:", { url, ogImage });
	// Extract text from the image
	try {
		const ocrResult = await ocr(ogImage, supabase, userId);
		if (!ocrResult) {
			console.error("[processOcr] OCR returned empty result:", {
				url,
				ogImage,
			});
			Sentry.captureMessage("OCR returned empty result", {
				level: "error",
				tags: {
					operation: "ocr_empty",
					userId,
				},
				extra: {
					url,
					ogImage,
				},
			});
			return { isOcrFailed: true, ocrResult: null };
		} else {
			console.log("[processOcr] OCR extraction completed successfully:", {
				url,
			});
			return { isOcrFailed: false, ocrResult };
		}
	} catch (error) {
		console.error("[processOcr] OCR threw error:", { url, ogImage, error });
		Sentry.captureException(error, {
			tags: {
				operation: "ocr_extraction",
				userId,
			},
			extra: {
				url,
				ogImage,
			},
		});
		return { isOcrFailed: true, ocrResult: null };
	}
};

const processImageCaption = async (
	ogImage: string,
	supabase: SupabaseClient,
	userId: string,
	url: string,
) => {
	console.log("[processImageCaption] Generating image caption:", {
		url,
		ogImage,
	});
	// Generate caption for the image
	try {
		const caption = await imageToText(ogImage, supabase, userId);
		if (!caption) {
			console.error(
				"[processImageCaption] imageToText returned empty result:",
				{ url, ogImage },
			);
			Sentry.captureMessage("Image caption generation returned empty result", {
				level: "error",
				tags: {
					operation: "image_caption_empty",
					userId,
				},
				extra: {
					url,
					ogImage,
				},
			});
			return { isImageCaptionFailed: true, image_caption: null };
		} else {
			console.log(
				"[processImageCaption] Image caption generated successfully:",
				{ url },
			);
			return { isImageCaptionFailed: false, image_caption: caption };
		}
	} catch (error) {
		console.error("[processImageCaption] imageToText threw error:", {
			url,
			ogImage,
			error,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "image_caption_generation",
				userId,
			},
			extra: {
				url,
				ogImage,
			},
		});
		return { isImageCaptionFailed: true, image_caption: null };
	}
};

const processBlurhash = async (ogImage: string, url: string) => {
	console.log("[processBlurhash] Generating blurhash:", { url, ogImage });
	try {
		const { width, height, encoded } = await blurhashFromURL(ogImage);
		if (!encoded || !width || !height) {
			console.error(
				"[processBlurhash] blurhashFromURL returned empty result:",
				{
					url,
					ogImage,
				},
			);
			Sentry.captureMessage("Blurhash generation returned empty result", {
				level: "error",
				tags: {
					operation: "blurhash_empty",
				},
				extra: {
					url,
					ogImage,
				},
			});
			return { isBlurhashFailed: true, blurhash: null };
		} else {
			console.log("[processBlurhash] Blurhash generated successfully:", {
				url,
				width,
				height,
			});
			return { isBlurhashFailed: false, blurhash: { width, height, encoded } };
		}
	} catch (error) {
		console.error("[processBlurhash] blurhashFromURL threw error:", {
			url,
			ogImage,
			error,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "blurhash_generation",
			},
			extra: {
				url,
				ogImage,
			},
		});
		return { isBlurhashFailed: true, blurhash: null };
	}
};
