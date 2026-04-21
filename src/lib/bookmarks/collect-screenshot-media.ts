/**
 * Server-safe media collection helpers for screenshot enrichment.
 *
 * Extracted from src/utils/helpers.ts which imports next/router at the top level
 * (forbidden in App Router). These functions only depend on server-safe modules.
 */

import ky, { HTTPError } from "ky";

import { logger } from "@/lib/api-helpers/axiom";
import { extractErrorFields } from "@/lib/api-helpers/errors";
import { upload, uploadVideo } from "@/lib/storage/media-upload";
import { MAX_VIDEO_SIZE_BYTES, VIDEO_DOWNLOAD_TIMEOUT_MS } from "@/utils/constants";
import { vet } from "@/utils/try";

// ============================================================
// Domain allowlists (mirrors helpers.ts validation)
// ============================================================

const ALLOWED_TWITTER_DOMAINS = new Set(["pbs.twimg.com", "video.twimg.com"]);
const ALLOWED_INSTAGRAM_DOMAINS = [".fbcdn.net", ".cdninstagram.com", ".instagram.com"];

export function isTwitterMediaUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && ALLOWED_TWITTER_DOMAINS.has(url.hostname);
  } catch {
    return false;
  }
}

export function isInstagramMediaUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.protocol === "https:" &&
      ALLOWED_INSTAGRAM_DOMAINS.some((domain) => url.hostname.endsWith(domain))
    );
  } catch {
    return false;
  }
}

// ============================================================
// Video collection
// ============================================================

type CollectVideoErrorType = "network" | "size" | "timeout" | "unknown" | "upload";

type CollectVideoResult =
  | {
      error: CollectVideoErrorType;
      message: string;
      success: false;
    }
  | {
      success: true;
      url: null | string;
    };

interface CollectVideoArgs {
  userId: string;
  videoUrl: null | string;
}

function getErrorTypeFromAbortSignal(error: unknown): CollectVideoErrorType {
  if (!(error instanceof Error)) {
    return "unknown";
  }

  const { name } = error;
  const message = error.message.toLowerCase();

  if (name === "AbortError" || name === "TimeoutError") {
    return "timeout";
  }

  if (message.includes("aborted") || message.includes("timeout")) {
    return "timeout";
  }

  if (name === "TypeError") {
    return "network";
  }

  return "unknown";
}

function validateVideoSize(
  response: Response,
  arrayBuffer: ArrayBuffer,
): { error?: string; isValid: boolean } {
  const SIZE_TOLERANCE_BYTES = 1024;

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const expectedSize = Number.parseInt(contentLength, 10);
    const sizeDiff = Math.abs(arrayBuffer.byteLength - expectedSize);
    if (sizeDiff > SIZE_TOLERANCE_BYTES) {
      return {
        error: `Size mismatch: expected ${expectedSize}, got ${arrayBuffer.byteLength}`,
        isValid: false,
      };
    }
  }

  return { isValid: true };
}

export async function collectVideo(args: CollectVideoArgs): Promise<CollectVideoResult> {
  const { userId, videoUrl } = args;

  if (!videoUrl) {
    return { success: true, url: null };
  }

  try {
    // URL validation
    try {
      const parsedUrl = new URL(videoUrl);

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        console.warn("[collectVideo] Invalid video URL:", {
          protocol: parsedUrl.protocol,
          userId,
          videoUrl,
        });
        return {
          error: "unknown",
          message: "Invalid video URL scheme. Only http and https are allowed.",
          success: false,
        };
      }

      const isTwitter = isTwitterMediaUrl(videoUrl);
      const isInstagram = isInstagramMediaUrl(videoUrl);

      if (!isTwitter && !isInstagram) {
        console.warn("[collectVideo] URL not allowlisted (must be Twitter or Instagram):", {
          userId,
          videoUrl,
        });
        return { error: "unknown", message: "Invalid video URL.", success: false };
      }

      if (isTwitter || isInstagram) {
        console.log("[collectVideo] Detected social media URL:", {
          platform: isTwitter ? "twitter" : "instagram",
          userId,
          videoUrl,
        });
      }
    } catch {
      console.warn("[collectVideo] Failed to parse video URL:", { userId, videoUrl });
      return { error: "unknown", message: "Invalid video URL.", success: false };
    }

    // Fetch with timeout
    const [downloadError, videoResponse] = await vet(() =>
      ky.get(videoUrl, { retry: 0, timeout: VIDEO_DOWNLOAD_TIMEOUT_MS }),
    );

    if (downloadError || !videoResponse) {
      const errorMessage = downloadError instanceof Error ? downloadError.message : "Unknown error";
      const errorType = getErrorTypeFromAbortSignal(downloadError);
      const status = downloadError instanceof HTTPError ? downloadError.response.status : undefined;

      console.warn("[collectVideo] Video download failed:", {
        error: errorMessage,
        errorType,
        status,
        userId,
        videoUrl,
      });

      return {
        error: errorType === "unknown" ? "network" : errorType,
        message: `Failed to download video: ${errorMessage}`,
        success: false,
      };
    }

    // Validate content type
    const rawContentType = videoResponse.headers.get("content-type") ?? "";
    const normalizedContentType = rawContentType.split(";")[0].trim().toLowerCase();

    if (!normalizedContentType.startsWith("video/")) {
      const error = `Invalid video content type: ${rawContentType || "missing"}`;
      console.warn("[collectVideo] Video validation failed:", {
        contentType: rawContentType,
        error,
        userId,
        validationType: "content-type",
        videoUrl,
      });
      return { error: "unknown", message: error, success: false };
    }

    // Validate size before downloading
    const contentLength = videoResponse.headers.get("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (size > MAX_VIDEO_SIZE_BYTES) {
        const error = `Video too large: ${size} bytes`;
        console.warn("[collectVideo] Video validation failed:", {
          error,
          size,
          userId,
          validationType: "size",
          videoUrl,
        });
        return { error: "size", message: error, success: false };
      }
    }

    // Download ArrayBuffer
    const [arrayBufferError, arrayBuffer] = await vet(() => videoResponse.arrayBuffer());

    if (arrayBufferError || !arrayBuffer) {
      const errorMessage =
        arrayBufferError instanceof Error ? arrayBufferError.message : "Unknown error";
      const errorType = getErrorTypeFromAbortSignal(arrayBufferError);

      console.warn("[collectVideo] Failed to read video array buffer:", {
        error: errorMessage,
        errorType,
        userId,
        videoUrl,
      });

      return {
        error: errorType,
        message: `Failed to get array buffer: ${errorMessage}`,
        success: false,
      };
    }

    // Validate downloaded content size
    const validation = validateVideoSize(videoResponse, arrayBuffer);
    if (!validation.isValid) {
      console.warn("[collectVideo] Video validation failed:", {
        error: validation.error,
        userId,
        validationType: "size-validation",
        videoUrl,
      });
      return { error: "size", message: validation.error ?? "Validation failed", success: false };
    }

    // Fallback size check when Content-Length was missing
    if (arrayBuffer.byteLength > MAX_VIDEO_SIZE_BYTES) {
      const error = `Video too large (post-download): ${arrayBuffer.byteLength} bytes`;
      console.warn("[collectVideo] Video validation failed:", {
        error,
        size: arrayBuffer.byteLength,
        userId,
        validationType: "size",
        videoUrl,
      });
      return { error: "size", message: error, success: false };
    }

    // Upload to R2
    const [uploadError, uploadedUrl] = await vet(() =>
      uploadVideo(arrayBuffer, userId, normalizedContentType),
    );

    if (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Unknown upload error";
      console.warn("[collectVideo] Video upload to R2 failed:", {
        error: message,
        userId,
        videoUrl,
      });
      return { error: "upload", message, success: false };
    }

    if (!uploadedUrl) {
      console.warn("[collectVideo] Video upload returned empty URL:", { userId, videoUrl });
      return {
        error: "upload",
        message: "Upload succeeded but returned empty URL",
        success: false,
      };
    }

    return { success: true, url: uploadedUrl };
  } catch (error) {
    console.warn("[collectVideo] Video upload failed:", {
      error,
      operation: "collect_video",
      userId,
      videoUrl,
    });

    logger.error("collect_video_failed", {
      operation: "collect_video",
      user_id: userId,
      video_url: videoUrl,
      ...extractErrorFields(error),
    });

    return {
      error: "unknown",
      message: error instanceof Error ? error.message : "Unknown error in collectVideo",
      success: false,
    };
  }
}

// ============================================================
// Additional images collection
// ============================================================

interface CollectAdditionalImagesArgs {
  allImages?: string[];
  userId: string;
}

export async function collectAdditionalImages(
  args: CollectAdditionalImagesArgs,
): Promise<string[]> {
  const { allImages, userId } = args;

  if (!allImages?.length) {
    return [];
  }

  const settledImages = await Promise.allSettled(
    allImages.map((b64buffer) => {
      const base64 = Buffer.from(b64buffer, "binary").toString("base64");
      return upload(base64, userId);
    }),
  );

  const failedUploads = settledImages
    .map((result, index) => ({ index, result }))
    .filter(
      ({ result }) =>
        result.status === "rejected" || (result.status === "fulfilled" && result.value === null),
    );

  if (failedUploads.length > 0) {
    const failureDetails = failedUploads.map(({ index, result }) => ({
      index,
      error:
        result.status === "rejected" ? String(result.reason) : "Image upload returned null URL",
    }));

    for (const detail of failureDetails) {
      console.warn("collectAdditionalImages upload failed:", {
        ...detail,
        operation: "collect_additional_images",
        userId,
      });
    }

    const successfulUploadsCount = settledImages.filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled" && typeof result.value === "string",
    ).length;

    logger.warn("collect_additional_images_partial_failure", {
      operation: "collect_additional_images",
      user_id: userId,
      failure_count: failedUploads.length,
      success_count: successfulUploadsCount,
      total_images: settledImages.length,
      failures: JSON.stringify(failureDetails),
    });
  }

  return settledImages
    .filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled" && typeof result.value === "string",
    )
    .map((fulfilled) => fulfilled.value);
}
