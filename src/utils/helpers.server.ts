import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";
import uniqid from "uniqid";

import {
	MAX_VIDEO_SIZE_BYTES,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
	VIDEO_DOWNLOAD_TIMEOUT_MS,
} from "./constants";
import { storageHelpers } from "./storageClient";
import imageToText from "@/async/ai/imageToText";
import { blurhashFromURL } from "@/utils/getBlurHash";

type EnrichMetadataParams = {
	existingMetadata: Record<string, unknown>;
	ogImage: string;
	isTwitterBookmark: boolean;
	isInstagramBookmark: boolean;
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
	isInstagramBookmark,
	videoUrl,
	userId,
	supabase,
	url,
}: EnrichMetadataParams): Promise<EnrichMetadataResult> => {
	// Run all AI operations in parallel
	const [videoResult, captionResult, blurhashResult] = await Promise.allSettled(
		[
			// Video upload (conditional)
			(isTwitterBookmark || isInstagramBookmark) &&
			videoUrl &&
			typeof videoUrl === "string"
				? (async () => {
						console.log(
							`[enrichMetadata] Uploading ${isTwitterBookmark ? "Twitter" : isInstagramBookmark ? "Instagram" : "Twitter/Instagram"} video to R2:`,
							{
								url,
							},
						);
						const r2VideoUrl = await uploadVideoToR2(
							videoUrl,
							userId,
							isTwitterBookmark,
							isInstagramBookmark,
						);
						if (r2VideoUrl) {
							console.log(
								`[enrichMetadata] ${isTwitterBookmark ? "Twitter" : isInstagramBookmark ? "Instagram" : "Twitter/Instagram"} video uploaded to R2:`,
								{
									url,
									r2VideoUrl,
								},
							);
							return r2VideoUrl;
						}

						// Upload failed but not critical - keep processing
						// Video upload is best-effort. If the URL is expired, the UI will
						// fall back to displaying the thumbnail image instead.
						console.warn(
							`[enrichMetadata] ${isTwitterBookmark ? "Twitter" : isInstagramBookmark ? "Instagram" : "Twitter/Instagram"} video upload failed, using original URL:`,
							{ url, videoUrl },
						);
						return videoUrl;
					})()
				: Promise.resolve(null),
			// Image caption + OCR generation (single Gemini call)
			processImageCaption(ogImage, supabase, userId, url, existingMetadata),
			// Blurhash generation
			processBlurhash(ogImage, url, userId),
		],
	);

	// Extract video URL from result
	const video_url =
		videoResult.status === "fulfilled" ? videoResult.value : null;

	const {
		isImageCaptionFailed,
		image_caption,
		image_keywords,
		ocr: ocrData,
		ocr_status: ocrStatus,
	} = captionResult.status === "fulfilled"
		? captionResult.value
		: {
				isImageCaptionFailed: true,
				image_caption: null,
				image_keywords: [],
				ocr: null,
				ocr_status: "no_text" as const,
			};

	// Extract blurhash result
	const { isBlurhashFailed, blurhash } =
		blurhashResult.status === "fulfilled"
			? blurhashResult.value
			: { isBlurhashFailed: true, blurhash: null };

	const metadata = {
		...existingMetadata,
		ocr: ocrData,
		ocr_status: ocrStatus,
		image_caption,
		image_keywords: image_keywords?.length ? image_keywords : undefined,
		width: blurhash?.width,
		height: blurhash?.height,
		ogImgBlurUrl: blurhash?.encoded,
		video_url,
	};

	const isFailed = isImageCaptionFailed || isBlurhashFailed;

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

const processImageCaption = async (
	ogImage: string,
	supabase: SupabaseClient,
	userId: string,
	url: string,
	existingMetadata: Record<string, unknown>,
) => {
	console.log("[processImageCaption] Generating image caption:", {
		url,
		ogImage,
	});
	// Generate caption for the image
	try {
		const result = await imageToText(ogImage, supabase, userId, {
			isPageScreenshot: Boolean(existingMetadata?.isPageScreenshot),
		});
		if (!result?.sentence) {
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
			return {
				isImageCaptionFailed: true,
				image_caption: null,
				image_keywords: [],
				ocr: null,
				ocr_status: "no_text" as const,
			};
		} else {
			console.log(
				"[processImageCaption] Image caption generated successfully:",
				{ url },
			);
			return {
				isImageCaptionFailed: false,
				image_caption: result.sentence,
				image_keywords: result.image_keywords ?? [],
				ocr: result.ocr_text,
				ocr_status: result.ocr_text
					? ("success" as const)
					: ("no_text" as const),
			};
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
		return {
			isImageCaptionFailed: true,
			image_caption: null,
			image_keywords: [],
			ocr: null,
			ocr_status: "no_text" as const,
		};
	}
};

const processBlurhash = async (
	ogImage: string,
	url: string,
	userId: string,
) => {
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
					userId,
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
				userId,
			},
			extra: {
				url,
				ogImage,
			},
		});
		return { isBlurhashFailed: true, blurhash: null };
	}
};

/**
 * Downloads a video from external URL and uploads to R2
 * @param videoUrl - External video URL
 * @param user_id - User ID for storage path
 * @param isTwitterBookmark - Whether this is a Twitter video
 * @param isInstagramBookmark - Whether this is an Instagram video
 * @returns R2 public URL or null if failed
 */
export const uploadVideoToR2 = async (
	videoUrl: string,
	user_id: string,
	isTwitterBookmark: boolean,
	isInstagramBookmark: boolean,
): Promise<string | null> => {
	try {
		// Validate URL based on bookmark type (defense in depth)
		if (isTwitterBookmark) {
			validateTwitterMediaUrl(videoUrl);
		} else if (isInstagramBookmark) {
			validateInstagramMediaUrl(videoUrl);
		}

		const videoResponse: Response = await fetch(videoUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; RecollectBot/1.0)",
				Accept: "video/*,*/*;q=0.8",
			},
			signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
		});

		if (!videoResponse.ok) {
			throw new Error(`HTTP error! status: ${videoResponse.status}`);
		}

		// Pre-download size check (Content-Length header - can be omitted/spoofed)
		const contentLength = videoResponse.headers.get("content-length");
		if (
			contentLength &&
			Number.parseInt(contentLength, 10) > MAX_VIDEO_SIZE_BYTES
		) {
			throw new Error(`Video size exceeds ${MAX_VIDEO_SIZE_BYTES} bytes limit`);
		}

		const arrayBuffer: ArrayBuffer = await videoResponse.arrayBuffer();

		// Post-download size check (Content-Length can be omitted/spoofed)
		if (arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
			throw new Error(
				`Video size ${arrayBuffer.byteLength} bytes exceeds ${MAX_VIDEO_SIZE_BYTES} bytes limit`,
			);
		}

		// Generate unique filename based on bookmark type
		const videoPrefix = isInstagramBookmark
			? "instagram-video"
			: isTwitterBookmark
				? "twitter-video"
				: "video";
		const videoName = `${videoPrefix}-${uniqid.time()}.mp4`;
		const storagePath = `${STORAGE_FILES_PATH}/${user_id}/${videoName}`;

		// Determine content type from response or default to mp4
		const contentType =
			videoResponse.headers.get("content-type") || "video/mp4";

		// Upload to R2
		const videoBuffer = Buffer.from(arrayBuffer);
		const { error: uploadError } = await storageHelpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath,
			videoBuffer,
			contentType,
		);

		if (uploadError) {
			const operation = isInstagramBookmark
				? "instagram_video_upload"
				: isTwitterBookmark
					? "twitter_video_upload"
					: "video_upload";
			Sentry.captureException(uploadError, {
				tags: { operation },
				extra: { videoUrl, userId: user_id },
			});
			console.error("R2 video upload failed:", uploadError);
			return null;
		}

		// Get public URL
		const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

		return storageData?.publicUrl || null;
	} catch (error) {
		console.error("Error in uploadVideoToR2:", error);

		const operation = isInstagramBookmark
			? "instagram_video_download"
			: isTwitterBookmark
				? "twitter_video_download"
				: "video_download";
		Sentry.captureException(error, {
			tags: { operation },
			extra: { videoUrl, userId: user_id },
		});

		return null;
	}
};

const ALLOWED_TWITTER_DOMAINS = ["video.twimg.com", "pbs.twimg.com"];

/**
 *
 * @param urlString - The URL to validate
 * @returns void - Throws an error if the URL is not valid
 */
export const validateTwitterMediaUrl = (urlString: string): void => {
	const url = new URL(urlString);
	if (url.protocol !== "https:") {
		throw new Error("Only HTTPS allowed");
	}

	if (!ALLOWED_TWITTER_DOMAINS.includes(url.hostname)) {
		throw new Error("Domain not in allowlist");
	}
};

const ALLOWED_INSTAGRAM_DOMAINS = [
	".fbcdn.net",
	".cdninstagram.com",
	".instagram.com",
];

/**
 * Validates Instagram media URLs to prevent SSRF attacks.
 * Only allows HTTPS and domains from Instagram's CDN.
 * @param urlString - The URL to validate
 * @returns void - Throws an error if the URL is not valid
 */
export const validateInstagramMediaUrl = (urlString: string): void => {
	const url = new URL(urlString);
	if (url.protocol !== "https:") {
		throw new Error("Only HTTPS allowed");
	}

	if (
		!ALLOWED_INSTAGRAM_DOMAINS.some((domain) => url.hostname.endsWith(domain))
	) {
		throw new Error("Domain not in allowlist");
	}
};
