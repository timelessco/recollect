import * as Sentry from "@sentry/nextjs";
import uniqid from "uniqid";

import type { StructuredKeywords, UserCollection } from "@/async/ai/schemas/image-analysis";
import type { Database } from "@/types/database.types";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { BookmarkContentType } from "@/utils/resolve-content-type";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToText } from "@/async/ai/imageToText";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { fetchUserCollections } from "@/utils/auto-assign-collections";
import { blurhashFromURL } from "@/utils/getBlurHash";

import {
  MAX_VIDEO_SIZE_BYTES,
  R2_MAIN_BUCKET_NAME,
  STORAGE_FILES_PATH,
  VIDEO_DOWNLOAD_TIMEOUT_MS,
} from "./constants";
import { storageHelpers } from "./storageClient";

interface EnrichMetadataParams {
  contentType?: BookmarkContentType;
  description?: null | string;
  existingMetadata: Record<string, unknown>;
  isInstagramBookmark: boolean;
  isOgImage?: boolean;
  isTwitterBookmark: boolean;
  ogImage: string;
  supabase: SupabaseClient<Database>;
  title?: null | string;
  url: string;
  userId: string;
  videoUrl?: null | string;
}

interface EnrichMetadataResult {
  error: null | string;
  isFailed: boolean;
  matchedCollectionIds: number[];
  metadata: Record<string, unknown>;
}

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
  contentType,
  description,
  existingMetadata,
  isInstagramBookmark,
  isOgImage,
  isTwitterBookmark,
  ogImage,
  supabase,
  title,
  url,
  userId,
  videoUrl,
}: EnrichMetadataParams): Promise<EnrichMetadataResult> => {
  const aiToggles = await fetchAiToggles({ supabase, userId });
  const userCollections = await fetchUserCollections({
    autoAssignEnabled: aiToggles.autoAssignCollections,
    supabase,
    userId,
  });

  // Run all AI operations in parallel
  const [videoResult, captionResult, blurhashResult] = await Promise.allSettled([
    // Video upload (conditional)
    (isTwitterBookmark || isInstagramBookmark) && videoUrl && typeof videoUrl === "string"
      ? (async () => {
          let platform: string;
          if (isTwitterBookmark) {
            platform = "Twitter";
          } else if (isInstagramBookmark) {
            platform = "Instagram";
          } else {
            platform = "Twitter/Instagram";
          }
          console.log(`[enrichMetadata] Uploading ${platform} video to R2:`, {
            url,
          });
          const r2VideoUrl = await uploadVideoToR2(
            videoUrl,
            userId,
            isTwitterBookmark,
            isInstagramBookmark,
          );
          if (r2VideoUrl) {
            console.log(`[enrichMetadata] ${platform} video uploaded to R2:`, {
              r2VideoUrl,
              url,
            });
            return r2VideoUrl;
          }

          // Upload failed but not critical - keep processing
          // Video upload is best-effort. If the URL is expired, the UI will
          // fall back to displaying the thumbnail image instead.
          console.warn(`[enrichMetadata] ${platform} video upload failed, using original URL:`, {
            url,
            videoUrl,
          });
          return videoUrl;
        })()
      : Promise.resolve(null),
    // Image caption + OCR generation (single Gemini call)
    processImageCaption(
      ogImage,
      supabase,
      userId,
      url,
      aiToggles,
      userCollections,
      contentType,
      isOgImage,
      title,
      description,
    ),
    // Blurhash generation
    processBlurhash(ogImage, url, userId),
  ]);

  // Extract video URL from result
  const video_url = videoResult.status === "fulfilled" ? videoResult.value : null;

  const {
    image_caption,
    image_keywords,
    isImageCaptionFailed,
    matchedCollectionIds,
    ocr: ocrData,
    ocr_status: ocrStatus,
  } = captionResult.status === "fulfilled"
    ? captionResult.value
    : {
        image_caption: null,
        image_keywords: {} as StructuredKeywords,
        isImageCaptionFailed: true,
        matchedCollectionIds: [] as number[],
        ocr: null,
        ocr_status: "no_text" as const,
      };

  // Extract blurhash result
  const { blurhash, isBlurhashFailed } =
    blurhashResult.status === "fulfilled"
      ? blurhashResult.value
      : { blurhash: null, isBlurhashFailed: true };

  const metadata = {
    ...existingMetadata,
    height: blurhash?.height,
    image_caption,
    image_keywords: Object.keys(image_keywords ?? {}).length > 0 ? image_keywords : undefined,
    ocr: ocrData,
    ocr_status: ocrStatus,
    ogImgBlurUrl: blurhash?.encoded,
    video_url,
    width: blurhash?.width,
  };

  const isFailed = isImageCaptionFailed || isBlurhashFailed;

  const failedOperations: string[] = [];

  if (isImageCaptionFailed) {
    failedOperations.push("image_caption");
  }

  if (isBlurhashFailed) {
    failedOperations.push("blurhash");
  }

  const error = failedOperations.length > 0 ? failedOperations.join(",") : null;

  console.log("[enrichMetadata] Enrichment completed:", {
    error,
    hasBlurhash: Boolean(metadata.ogImgBlurUrl),
    hasImageCaption: Boolean(metadata.image_caption),
    hasOcr: Boolean(metadata.ocr),
    hasVideo: Boolean(metadata.video_url),
    isFailed,
    url,
  });

  return { error, isFailed, matchedCollectionIds, metadata };
};

const processImageCaption = async (
  ogImage: string,
  supabase: SupabaseClient,
  userId: string,
  url: string,
  aiToggles: AiToggles,
  userCollections: UserCollection[],
  contentType?: BookmarkContentType,
  isOgImage?: boolean,
  title?: null | string,
  description?: null | string,
) => {
  console.log("[processImageCaption] Generating image caption:", {
    ogImage,
    url,
  });
  // Generate caption for the image
  try {
    const result = await imageToText(
      ogImage,
      supabase,
      userId,
      { contentType, isOgImage },
      {
        collections: userCollections,
        description,
        title,
        url,
      },
      aiToggles,
    );
    if (!result?.sentence) {
      // When aiSummary is OFF, null sentence is expected — not a failure
      if (aiToggles.aiSummary) {
        console.error("[processImageCaption] imageToText returned empty result:", { ogImage, url });
        Sentry.captureMessage("Image caption generation returned empty result", {
          extra: {
            ogImage,
            url,
          },
          level: "error",
          tags: {
            operation: "image_caption_empty",
            userId,
          },
        });
      }

      return {
        image_caption: null,
        image_keywords: result?.image_keywords ?? {},
        isImageCaptionFailed: aiToggles.aiSummary,
        matchedCollectionIds: result?.matched_collection_ids ?? [],
        ocr: result?.ocr_text ?? null,
        ocr_status: result?.ocr_text ? ("success" as const) : ("no_text" as const),
      };
    }
    console.log("[processImageCaption] Image caption generated successfully:", { url });
    return {
      image_caption: result.sentence,
      image_keywords: result.image_keywords ?? {},
      isImageCaptionFailed: false,
      matchedCollectionIds: result.matched_collection_ids ?? [],
      ocr: result.ocr_text,
      ocr_status: result.ocr_text ? ("success" as const) : ("no_text" as const),
    };
  } catch (error) {
    console.error("[processImageCaption] imageToText threw error:", {
      error,
      ogImage,
      url,
    });
    Sentry.captureException(error, {
      extra: {
        ogImage,
        url,
      },
      tags: {
        operation: "image_caption_generation",
        userId,
      },
    });
    return {
      image_caption: null,
      image_keywords: {},
      isImageCaptionFailed: true,
      matchedCollectionIds: [],
      ocr: null,
      ocr_status: "no_text" as const,
    };
  }
};

const processBlurhash = async (ogImage: string, url: string, userId: string) => {
  console.log("[processBlurhash] Generating blurhash:", { ogImage, url });
  try {
    const { encoded, height, width } = await blurhashFromURL(ogImage);
    if (!encoded || !width || !height) {
      console.error("[processBlurhash] blurhashFromURL returned empty result:", {
        ogImage,
        url,
      });
      Sentry.captureMessage("Blurhash generation returned empty result", {
        extra: {
          ogImage,
          url,
        },
        level: "error",
        tags: {
          operation: "blurhash_empty",
          userId,
        },
      });
      return { blurhash: null, isBlurhashFailed: true };
    }
    console.log("[processBlurhash] Blurhash generated successfully:", {
      height,
      url,
      width,
    });
    return { blurhash: { encoded, height, width }, isBlurhashFailed: false };
  } catch (error) {
    console.error("[processBlurhash] blurhashFromURL threw error:", {
      error,
      ogImage,
      url,
    });
    Sentry.captureException(error, {
      extra: {
        ogImage,
        url,
      },
      tags: {
        operation: "blurhash_generation",
        userId,
      },
    });
    return { blurhash: null, isBlurhashFailed: true };
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
): Promise<null | string> => {
  try {
    // Validate URL based on bookmark type (defense in depth)
    if (isTwitterBookmark) {
      validateTwitterMediaUrl(videoUrl);
    } else if (isInstagramBookmark) {
      validateInstagramMediaUrl(videoUrl);
    }

    const videoResponse: Response = await fetch(videoUrl, {
      headers: {
        Accept: "video/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; RecollectBot/1.0)",
      },
      signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
    });

    if (!videoResponse.ok) {
      throw new Error(`HTTP error! status: ${videoResponse.status}`);
    }

    // Pre-download size check (Content-Length header - can be omitted/spoofed)
    const contentLength = videoResponse.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_VIDEO_SIZE_BYTES) {
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
    let videoPrefix: string;
    if (isInstagramBookmark) {
      videoPrefix = "instagram-video";
    } else if (isTwitterBookmark) {
      videoPrefix = "twitter-video";
    } else {
      videoPrefix = "video";
    }
    const videoName = `${videoPrefix}-${uniqid.time()}.mp4`;
    const storagePath = `${STORAGE_FILES_PATH}/${user_id}/${videoName}`;

    // Determine content type from response or default to mp4
    const contentType = videoResponse.headers.get("content-type") ?? "video/mp4";

    // Upload to R2
    const videoBuffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await storageHelpers.uploadObject(
      R2_MAIN_BUCKET_NAME,
      storagePath,
      videoBuffer,
      contentType,
    );

    if (uploadError) {
      let operation: string;
      if (isInstagramBookmark) {
        operation = "instagram_video_upload";
      } else if (isTwitterBookmark) {
        operation = "twitter_video_upload";
      } else {
        operation = "video_upload";
      }
      Sentry.captureException(uploadError, {
        extra: { userId: user_id, videoUrl },
        tags: { operation },
      });
      console.error("R2 video upload failed:", uploadError);
      return null;
    }

    // Get public URL
    const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

    return storageData?.publicUrl || null;
  } catch (error) {
    console.error("Error in uploadVideoToR2:", error);

    let operation: string;
    if (isInstagramBookmark) {
      operation = "instagram_video_download";
    } else if (isTwitterBookmark) {
      operation = "twitter_video_download";
    } else {
      operation = "video_download";
    }
    Sentry.captureException(error, {
      extra: { userId: user_id, videoUrl },
      tags: { operation },
    });

    return null;
  }
};

const ALLOWED_TWITTER_DOMAINS = new Set(["pbs.twimg.com", "video.twimg.com"]);

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

  if (!ALLOWED_TWITTER_DOMAINS.has(url.hostname)) {
    throw new Error("Domain not in allowlist");
  }
};

const ALLOWED_INSTAGRAM_DOMAINS = [".fbcdn.net", ".cdninstagram.com", ".instagram.com"];

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

  if (!ALLOWED_INSTAGRAM_DOMAINS.some((domain) => url.hostname.endsWith(domain))) {
    throw new Error("Domain not in allowlist");
  }
};
