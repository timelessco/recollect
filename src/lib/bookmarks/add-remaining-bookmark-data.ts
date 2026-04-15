import * as Sentry from "@sentry/nextjs";
import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import type { StructuredKeywords } from "@/async/ai/schemas/image-analysis-schema";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToText } from "@/async/ai/image-analysis";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import { createServerServiceClient } from "@/lib/supabase/service";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { isNullable } from "@/utils/assertion-utils";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  getBaseUrl,
  IMAGE_DOWNLOAD_TIMEOUT_MS,
  IMAGE_JPEG_MIME_TYPE,
  IMAGE_MIME_PREFIX,
  isAcceptedMimeType,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  R2_MAIN_BUCKET_NAME,
  STORAGE_SCRAPPED_IMAGES_PATH,
  V2_GET_MEDIA_TYPE_API,
} from "@/utils/constants";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { resolveContentType } from "@/utils/resolve-content-type";
import { storageHelpers } from "@/utils/storageClient";
import { toJson } from "@/utils/type-utils";

/** Shape of meta_data JSON fields accessed during enrichment */
interface BookmarkMetaData {
  [key: string]: unknown;
  coverImage?: null | string;
  height?: null | number;
  image_keywords?: StructuredKeywords;
  img_caption?: null | string;
  isOgImagePreferred?: boolean;
  mediaType?: null | string;
  ocr?: null | string;
  ocr_status?: "limit_reached" | "no_text" | "success";
  ogImgBlurUrl?: null | string;
  screenshot?: null | string;
  width?: null | number;
}

/** Shape of the bookmark row fetched for enrichment */
interface BookmarkEnrichmentRow {
  description: null | string;
  meta_data: BookmarkMetaData | null;
  ogImage: null | string;
  title: null | string;
  type: null | string;
}

export interface AddRemainingBookmarkDataProps {
  favIcon?: null | string;
  id: number;
  supabase: SupabaseClient<Database>;
  url: string;
  userId: string;
}

// ============================================================
// Server-safe inlined helpers (avoid importing @/utils/helpers which pulls in next/router)
// ============================================================

/**
 * Fetches the MIME type of a URL via the get-media-type API endpoint.
 * Inlined from supabaseCrudHelpers to avoid lodash/next-router transitive imports.
 */
async function getMediaType(url: string): Promise<null | string> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}/${V2_GET_MEDIA_TYPE_API}?url=${encodedUrl}`,
      { method: "GET" },
    );

    if (!response.ok) {
      console.error("Error in getting media type");
      return null;
    }

    const json: unknown = await response.json();
    if (json !== null && json !== undefined && typeof json === "object" && "mediaType" in json) {
      const { mediaType } = json;
      return typeof mediaType === "string" ? mediaType : null;
    }

    return null;
  } catch (error) {
    console.error("Error getting media type:", error);
    return null;
  }
}

async function checkIfUrlAnImage(url: string): Promise<boolean> {
  const mediaType = await getMediaType(url);
  return mediaType?.startsWith(IMAGE_MIME_PREFIX) ?? false;
}

async function checkIfUrlAnMedia(url: string): Promise<boolean> {
  const mediaType = await getMediaType(url);
  return isAcceptedMimeType(mediaType);
}

function getNormalisedUrl(url: string): null | string {
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    return null;
  } catch {
    return null;
  }
}

async function getNormalisedImageUrl(imageUrl: null | string, url: string): Promise<null | string> {
  try {
    const { hostname } = new URL(url);

    if (imageUrl) {
      const normalisedUrl = getNormalisedUrl(imageUrl);
      if (normalisedUrl) {
        return normalisedUrl;
      }

      return new URL(imageUrl, `https://${hostname}`).href;
    }

    const response = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
    );

    if (!response.ok) {
      throw new Error(`Invalid response for the ${hostname}: ${response.statusText}`);
    }

    return response.url;
  } catch (error) {
    console.warn("Error fetching Image:", error);
    return null;
  }
}

/**
 * Uploads a base64-encoded image to R2 storage.
 * Returns the public URL on success, null on failure.
 * This is distinct from `@/lib/storage/media-upload` — it handles scraper image uploads
 * with a specific storage path pattern.
 */
export async function uploadImageToR2(
  base64info: string,
  userIdForStorage: string,
  storagePath: null | string,
): Promise<null | string> {
  try {
    const imgName = `img-${uniqid?.time()}.jpg`;
    const resolvedPath =
      storagePath ?? `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

    console.log("[add-remaining-bookmark-data] Uploading image to R2:", { path: resolvedPath });

    const { error: uploadError } = await storageHelpers.uploadObject(
      R2_MAIN_BUCKET_NAME,
      resolvedPath,
      new Uint8Array(decode(base64info)),
      IMAGE_JPEG_MIME_TYPE,
    );

    if (uploadError) {
      Sentry.captureException(new Error("R2 upload failed"), {
        extra: { resolvedPath, uploadError },
        tags: { operation: "r2_upload" },
      });
      console.error("[add-remaining-bookmark-data] R2 upload failed:", {
        resolvedPath,
        uploadError,
      });
      return null;
    }

    const { data: storageData } = storageHelpers.getPublicUrl(resolvedPath);
    const publicUrl = storageData?.publicUrl ?? null;
    console.log("[add-remaining-bookmark-data] R2 upload successful:", { publicUrl, resolvedPath });

    return publicUrl;
  } catch (error) {
    console.error("[add-remaining-bookmark-data] R2 upload exception:", error);
    return null;
  }
}

/**
 * Downloads an image from a URL using fetch with AbortController timeout.
 * Returns base64-encoded string on success, null on failure.
 */
async function downloadImageAsBase64(imageUrl: string): Promise<null | string> {
  try {
    console.log("[add-remaining-bookmark-data] Downloading image:", { imageUrl });
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[add-remaining-bookmark-data] Image download failed:", {
        imageUrl,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("[add-remaining-bookmark-data] Image downloaded:", {
      imageUrl,
      sizeBytes: arrayBuffer.byteLength,
    });
    if (arrayBuffer.byteLength === 0) {
      console.error("[add-remaining-bookmark-data] Image body was empty:", { imageUrl });
      return null;
    }
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("[add-remaining-bookmark-data] Image download exception:", { error, imageUrl });
    return null;
  }
}

/**
 * Enriches a bookmark with remaining data: R2 image upload, blurhash, AI caption/OCR,
 * auto-assign collections, meta_data merge, and revalidation.
 *
 * Throws on critical errors. Non-critical operations (blurhash, AI, revalidation)
 * log errors but do not throw.
 *
 * Called from:
 * - v2 thin wrapper endpoint (factory try-catch converts to apiError)
 * - after() in other routes (caller's try-catch captures with Sentry)
 */
export async function addRemainingBookmarkData(
  props: AddRemainingBookmarkDataProps,
): Promise<void> {
  const { id, url, supabase, userId } = props;

  console.log("[add-remaining-bookmark-data] Starting enrichment:", { bookmarkId: id, url });

  // 1. Fetch current bookmark data
  const { data: currentData, error: currentDataError } = await supabase
    .from(MAIN_TABLE_NAME)
    .select("ogImage, meta_data, description, title, type")
    .match({ id })
    .single<BookmarkEnrichmentRow>();

  if (currentDataError) {
    throw new Error(`Failed to fetch current bookmark data: ${currentDataError.message}`);
  }

  if (isNullable(currentData)) {
    throw new Error(`Bookmark not found with id: ${id}`);
  }

  console.log("[add-remaining-bookmark-data] Fetched bookmark:", {
    bookmarkId: id,
    hasOgImage: Boolean(currentData.ogImage),
    hasMetaData: Boolean(currentData.meta_data),
    type: currentData.type,
  });

  // Fetch AI toggles and user collections for auto-assignment
  const aiToggles = await fetchAiToggles({ supabase, userId });
  const userCollections = await fetchUserCollections({
    autoAssignEnabled: aiToggles.autoAssignCollections,
    supabase,
    userId,
  });
  console.log("[add-remaining-bookmark-data] AI toggles and collections:", {
    aiToggles,
    bookmarkId: id,
    collectionCount: userCollections.length,
  });

  // 2. Check if URL itself is an image — if so, download and upload to R2
  let uploadedImageThatIsAUrl: null | string = null;
  const isUrlAnImage = await checkIfUrlAnImage(url);
  console.log("[add-remaining-bookmark-data] URL media check:", { bookmarkId: id, isUrlAnImage });

  if (isUrlAnImage) {
    try {
      const realImageUrl = new URL(url).searchParams.get("url");
      const downloadUrl = realImageUrl ?? url;

      const returnedB64 = await downloadImageAsBase64(downloadUrl);

      if (isNullable(returnedB64)) {
        console.error("Failed to download image URL, continuing without image");
        Sentry.captureException(new Error("Failed to download image URL"), {
          tags: { operation: "download_image_url" },
        });
      } else {
        uploadedImageThatIsAUrl = await uploadImageToR2(returnedB64, userId, null);

        if (isNullable(uploadedImageThatIsAUrl)) {
          console.error("Failed to upload image URL to R2, continuing without image");
          Sentry.captureException(new Error("Failed to upload image URL to R2"), {
            tags: { operation: "upload_image_url_to_r2" },
          });
        }
      }
    } catch (error) {
      console.error("Error uploading image URL to R2:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "upload_image_url_to_r2" },
      });
      uploadedImageThatIsAUrl = null;
    }
  }

  // 3. Upload OG/scraper image to R2 (cover image)
  let uploadedCoverImageUrl: null | string = null;
  const isUrlAnMedia = await checkIfUrlAnMedia(url);
  const isAudio = currentData.meta_data?.mediaType?.includes("audio");
  const contentType = resolveContentType({
    mediaType: currentData.meta_data?.mediaType ?? undefined,
    type: currentData.type ?? undefined,
  });
  console.log("[add-remaining-bookmark-data] Cover image context:", {
    bookmarkId: id,
    contentType,
    hasOgImage: Boolean(currentData.ogImage),
    isAudio,
    isUrlAnMedia,
  });

  if (currentData.ogImage && !isUrlAnMedia) {
    const ogImageNormalisedUrl = await getNormalisedImageUrl(currentData.ogImage, url);

    try {
      const downloadUrl = ogImageNormalisedUrl ?? currentData.ogImage;
      const returnedB64 = await downloadImageAsBase64(downloadUrl);

      if (isNullable(returnedB64)) {
        uploadedCoverImageUrl = currentData.ogImage;
        console.error("Failed to download scraper image, using original ogImage");
      } else {
        uploadedCoverImageUrl = await uploadImageToR2(returnedB64, userId, null);

        if (isNullable(uploadedCoverImageUrl)) {
          uploadedCoverImageUrl = currentData.ogImage;
          console.error("Failed to upload image to R2, continuing without image");
          Sentry.captureException(new Error("Failed to upload image to R2"), {
            tags: { operation: "upload_scrapped_image_to_r2" },
          });
        }
      }
    } catch (error) {
      uploadedCoverImageUrl = currentData.ogImage;
      console.error("Error uploading scrapped image to R2:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "upload_scrapped_image_to_r2" },
      });
    }
  }

  // 4. Generate blurhash and AI data
  let imgData: {
    encoded: null | string;
    height: null | number | undefined;
    width: null | number | undefined;
  } = {
    encoded: null,
    height: null,
    width: null,
  };
  let imageOcrValue: null | string = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let imageCaption: null | string = null;
  let imageKeywords: StructuredKeywords = {};

  // OG image metadata generation URL
  const ogImageMetaDataGeneration = uploadedCoverImageUrl ?? currentData.meta_data?.screenshot;

  // Determine which image URL to use for metadata generation
  let imageUrlForMetaDataGeneration: null | string | undefined;
  if (isUrlAnImage) {
    imageUrlForMetaDataGeneration = uploadedImageThatIsAUrl;
  } else if (isAudio && currentData.ogImage) {
    imageUrlForMetaDataGeneration = currentData.ogImage;
  } else {
    imageUrlForMetaDataGeneration = currentData.meta_data?.screenshot ?? uploadedCoverImageUrl;
  }

  const hasImageForProcessing =
    !isNullable(imageUrlForMetaDataGeneration) || !isNullable(ogImageMetaDataGeneration);

  if (hasImageForProcessing) {
    console.log("[add-remaining-bookmark-data] Processing image metadata:", {
      bookmarkId: id,
      imageUrlForMetaDataGeneration,
      ogImageMetaDataGeneration,
    });

    // 4a. Blurhash
    try {
      const blurhashSource = currentData.meta_data?.isOgImagePreferred
        ? ogImageMetaDataGeneration
        : imageUrlForMetaDataGeneration;

      if (blurhashSource) {
        console.log("[add-remaining-bookmark-data] Generating blurhash from:", {
          bookmarkId: id,
          source: blurhashSource,
        });
        imgData = await blurhashFromURL(blurhashSource);
        console.log("[add-remaining-bookmark-data] Blurhash generated:", {
          bookmarkId: id,
          hasEncoded: Boolean(imgData.encoded),
        });
      }
    } catch (error) {
      console.error("[add-remaining-bookmark-data] Blurhash generation failed:", {
        bookmarkId: id,
        error,
      });
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: { bookmarkId: id },
        tags: { operation: "generate_blurhash" },
      });
    }

    // 4b. AI image-to-text (OCR, caption, keywords)
    try {
      const isOgImage =
        (currentData.meta_data?.isOgImagePreferred ?? false) || !currentData.meta_data?.screenshot;

      const aiImageSource = currentData.meta_data?.isOgImagePreferred
        ? ogImageMetaDataGeneration
        : imageUrlForMetaDataGeneration;

      if (aiImageSource) {
        console.log("[add-remaining-bookmark-data] Running AI image analysis:", {
          aiImageSource,
          bookmarkId: id,
          contentType,
          isOgImage,
        });

        const imageToTextResult = await imageToText(
          aiImageSource,
          supabase,
          userId,
          { contentType, isOgImage },
          {
            collections: userCollections,
            description: currentData.description,
            title: currentData.title,
            url,
          },
          aiToggles,
        );

        if (imageToTextResult) {
          imageCaption = imageToTextResult.sentence;
          imageKeywords = imageToTextResult.image_keywords ?? {};
          imageOcrValue = imageToTextResult.ocr_text;
          ocrStatus = imageToTextResult.ocr_text ? "success" : "no_text";

          console.log("[add-remaining-bookmark-data] AI analysis complete:", {
            bookmarkId: id,
            hasCaption: Boolean(imageCaption),
            keywordCount: Object.keys(imageKeywords).length,
            matchedCollections: imageToTextResult.matched_collection_ids?.length ?? 0,
            ocrStatus,
          });

          // Auto-assign collections (non-critical, handled internally)
          await autoAssignCollections({
            bookmarkId: id,
            matchedCollectionIds: imageToTextResult.matched_collection_ids,
            route: "add-remaining-bookmark-data",
            userId,
          });
        }
      }
    } catch (error) {
      console.error("[add-remaining-bookmark-data] AI processing failed:", {
        bookmarkId: id,
        error,
      });
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: { bookmarkId: id },
        tags: { operation: "gemini_ai_processing" },
      });
    }
  } else {
    console.log(
      "[add-remaining-bookmark-data] No image available for processing, skipping blurhash and AI:",
      {
        bookmarkId: id,
      },
    );
  }

  // 5. Merge meta_data preserving existing values
  const existingMetaData = currentData.meta_data ?? {};

  const meta_data = {
    ...existingMetaData,
    coverImage: uploadedCoverImageUrl,
    height: imgData.height,
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption,
    ocr: imageOcrValue,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData.encoded,
    width: imgData.width,
  };

  // Preserve existing ogImage when computed value would be null
  const computedOgImage = currentData.meta_data?.isOgImagePreferred
    ? ogImageMetaDataGeneration
    : imageUrlForMetaDataGeneration;

  const finalOgImage = computedOgImage ?? currentData.ogImage;
  const finalDescription = currentData.description ?? imageCaption;

  console.log("[add-remaining-bookmark-data] Updating bookmark in DB:", {
    bookmarkId: id,
    hasCoverImage: Boolean(uploadedCoverImageUrl),
    hasOgImgBlurUrl: Boolean(imgData.encoded),
    ogImageSource: computedOgImage ? "computed" : "existing",
    ocrStatus,
  });

  // 6. Update bookmark in database
  const { data: updateData, error: databaseError } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({
      description: finalDescription,
      meta_data: toJson(meta_data),
      ogImage: finalOgImage,
    })
    .match({ id })
    .select("id");

  if (isNullable(updateData)) {
    throw new Error(`DB return data is empty after update: ${databaseError?.message}`);
  }

  if (databaseError) {
    throw new Error(`add remaining bookmark data error: ${databaseError.message}`);
  }

  console.log("[add-remaining-bookmark-data] DB update successful:", { bookmarkId: id });

  // 7. Revalidate public categories
  try {
    const serviceClient = createServerServiceClient();

    const { data: bookmarkCategories } = await serviceClient
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .select("category_id")
      .eq("bookmark_id", id);

    const categoryIds = bookmarkCategories?.map((bc) => bc.category_id) ?? [];

    if (categoryIds.length > 0) {
      console.log("[add-remaining-bookmark-data] Initiating revalidation:", {
        bookmarkId: id,
        categoryIds,
        userId,
      });

      await revalidateCategoriesIfPublic(categoryIds, {
        operation: "update_bookmark_metadata",
        userId,
      });
    } else {
      console.log("[add-remaining-bookmark-data] No categories to revalidate:", {
        bookmarkId: id,
      });
    }
  } catch (error) {
    // Log but do not throw — metadata update already succeeded
    console.error("[add-remaining-bookmark-data] Revalidation failed:", {
      bookmarkId: id,
      error,
      errorMessage:
        error instanceof Error
          ? error.message
          : "revalidation failed in add-remaining-bookmark-data",
      userId,
    });
    Sentry.captureException(error, {
      extra: { bookmarkId: id, userId },
      tags: { route: "add-remaining-bookmark-data" },
    });
  }

  console.log("[add-remaining-bookmark-data] Enrichment complete:", { bookmarkId: id, url });
}
