import type { NextRequest } from "next/server";
import { after } from "next/server";

import * as Sentry from "@sentry/nextjs";
import slugify from "slugify";

import type { UserCollection } from "@/async/ai/imageToText";
import type { HandlerConfig } from "@/lib/api-helpers/create-handler";
import type { Database } from "@/types/database.types";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToText } from "@/async/ai/imageToText";
import { apiError, apiSuccess, apiWarn, parseBody } from "@/lib/api-helpers/response";
import { uploadFileRemainingData } from "@/lib/files/upload-file-remaining-data";
import { requireAuth } from "@/lib/supabase/api";
import { fetchAiToggles } from "@/utils/ai-feature-toggles";
import { isNullable } from "@/utils/assertion-utils";
import { autoAssignCollections, fetchUserCollections } from "@/utils/auto-assign-collections";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "@/utils/category-auth";
import {
  AUDIO_OG_IMAGE_FALLBACK_URL,
  BOOKMARK_CATEGORIES_TABLE_NAME,
  FILE_NAME_PARSING_PATTERN,
  getBaseUrl,
  MAIN_TABLE_NAME,
  NEXT_API_URL,
  PDF_MIME_TYPE,
  STORAGE_FILES_PATH,
} from "@/utils/constants";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { normalizeUploadedMimeType } from "@/utils/mime";
import { storageHelpers } from "@/utils/storageClient";
import { toJson } from "@/utils/type-utils";

import { UploadFileInputSchema, UploadFileOutputSchema } from "./schema";

const ROUTE = "v2-file-upload-file";

// ============================================================
// Server-safe inlined helpers
// ============================================================

function parseUploadFileName(name: string): string {
  return slugify(name || "", { lower: true, remove: FILE_NAME_PARSING_PATTERN });
}

async function getMediaType(url: string): Promise<null | string> {
  try {
    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(
      `${getBaseUrl()}${NEXT_API_URL}/v1/bookmarks/get/get-media-type?url=${encodedUrl}`,
      { method: "GET" },
    );

    if (!response.ok) {
      console.error("[upload-file] Error getting media type");
      return null;
    }

    const json: unknown = await response.json();
    if (json !== null && json !== undefined && typeof json === "object" && "mediaType" in json) {
      const { mediaType } = json;
      return typeof mediaType === "string" ? mediaType : null;
    }

    return null;
  } catch (error) {
    console.error("[upload-file] Error getting media type:", error);
    return null;
  }
}

// ============================================================
// Video processing (inline — v1 videoLogic)
// ============================================================

interface VideoResult {
  matchedCollectionIds: number[];
  meta_data: Record<string, unknown>;
  ogImage: null | string;
}

async function processVideo(
  thumbnailPath: null | string,
  supabase: SupabaseClient<Database>,
  userId: string,
  aiToggles: AiToggles,
  userCollections: UserCollection[],
): Promise<VideoResult> {
  if (!thumbnailPath) {
    throw new Error("ERROR: thumbnailPath is missing for video file");
  }

  const { data: thumbnailUrl } = storageHelpers.getPublicUrl(thumbnailPath);
  const ogImage = thumbnailUrl?.publicUrl ?? null;

  let imgData: { encoded?: null | string; height?: null | number; width?: null | number } = {};
  let ocrData: null | string = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let imageCaption: null | string = null;
  let imageKeywords: string[] = [];
  let matchedCollectionIds: number[] = [];

  if (thumbnailUrl?.publicUrl) {
    try {
      imgData = await blurhashFromURL(thumbnailUrl.publicUrl);
    } catch (error) {
      console.error("[upload-file] Blurhash generation failed:", error);
      Sentry.captureException(error, {
        tags: { operation: "blurhash_generation", thumbnailUrl: thumbnailUrl.publicUrl },
      });
      imgData = {};
    }

    try {
      const imageToTextResult = await imageToText(
        thumbnailUrl.publicUrl,
        supabase,
        userId,
        { contentType: "video" },
        { collections: userCollections },
        aiToggles,
      );
      imageCaption = imageToTextResult?.sentence ?? null;
      imageKeywords = imageToTextResult?.image_keywords ?? [];
      matchedCollectionIds = imageToTextResult?.matched_collection_ids ?? [];
      ocrData = imageToTextResult?.ocr_text ?? null;
      ocrStatus = imageToTextResult?.ocr_text ? "success" : "no_text";
    } catch (error) {
      console.error("[upload-file] Image caption generation failed:", error);
      Sentry.captureException(error, {
        tags: { operation: "image_caption_generation", thumbnailUrl: thumbnailUrl.publicUrl },
      });
      imageCaption = null;
    }
  }

  const meta_data: Record<string, unknown> = {
    coverImage: null,
    favIcon: null,
    height: imgData.height ?? null,
    iframeAllowed: false,
    image_caption: imageCaption,
    image_keywords: imageKeywords.length > 0 ? imageKeywords : undefined,
    img_caption: imageCaption,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType: "",
    ocr: ocrData,
    ocr_status: ocrStatus,
    ogImgBlurUrl: imgData.encoded ?? null,
    screenshot: null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData.width ?? null,
  };

  return { matchedCollectionIds, meta_data, ogImage };
}

// ============================================================
// Route handler
// ============================================================

async function handlePost(request: NextRequest) {
  try {
    const auth = await requireAuth(ROUTE);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { supabase, user } = auth;
    const { id: userId, email } = user;

    const parsed = await parseBody({ request, route: ROUTE, schema: UploadFileInputSchema });
    if (parsed.errorResponse) {
      return parsed.errorResponse;
    }

    const { data } = parsed;

    if (!email) {
      return apiWarn({
        context: { userId },
        message: "User email not available",
        route: ROUTE,
        status: 400,
      });
    }

    const fileName = parseUploadFileName(data.name);
    const fileType = normalizeUploadedMimeType(data.type);

    console.log(`[${ROUTE}] API called:`, {
      categoryId: data.category_id,
      fileName,
      fileType,
      userId,
    });

    const uploadPath = parseUploadFileName(data.uploadFileNamePath);
    const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;

    // Check category ownership if not uncategorized
    if (data.category_id !== 0) {
      const hasAccess = await checkIfUserIsCategoryOwnerOrCollaborator({
        categoryId: data.category_id,
        email,
        supabase,
        userId,
      });

      if (!hasAccess) {
        return apiWarn({
          context: { categoryId: data.category_id, userId },
          message:
            "User is neither owner or collaborator for the collection or does not have edit access",
          route: ROUTE,
          status: 403,
        });
      }
    }

    // Get public URL for the uploaded file (uploaded client-side to R2)
    const { data: storageData } = storageHelpers.getPublicUrl(storagePath);
    const filePublicUrl = storageData?.publicUrl;

    if (isNullable(filePublicUrl)) {
      return apiError({
        error: new Error("Public URL not available"),
        extra: { storagePath },
        message: "Error getting file URL",
        operation: "get_public_url",
        route: ROUTE,
        userId,
      });
    }

    const detectedMediaType = await getMediaType(filePublicUrl);

    const isVideo = fileType.includes("video");
    const isAudio = fileType.includes("audio");
    const isPdf = fileType === PDF_MIME_TYPE;

    // Fetch AI toggles + collections for video processing
    const aiToggles = await fetchAiToggles({ supabase, userId });
    const userCollections = await fetchUserCollections({
      autoAssignEnabled: aiToggles.autoAssignCollections,
      supabase,
      userId,
    });

    let ogImage: null | string;
    let metaData: Record<string, unknown>;
    let videoMatchedCollectionIds: number[] = [];

    if (isVideo) {
      const videoResult = await processVideo(
        data.thumbnailPath ?? null,
        supabase,
        userId,
        aiToggles,
        userCollections,
      );
      ({
        matchedCollectionIds: videoMatchedCollectionIds,
        meta_data: metaData,
        ogImage,
      } = videoResult);
    } else {
      ogImage = filePublicUrl;

      if (isAudio) {
        ogImage = AUDIO_OG_IMAGE_FALLBACK_URL;
      } else if (isPdf && data.thumbnailPath) {
        const { data: thumbData } = storageHelpers.getPublicUrl(data.thumbnailPath);
        if (thumbData?.publicUrl) {
          ogImage = thumbData.publicUrl;
        }
      }

      metaData = {
        coverImage: null,
        favIcon: null,
        height: null,
        iframeAllowed: false,
        image_caption: null,
        img_caption: null,
        isOgImagePreferred: false,
        isPageScreenshot: null,
        mediaType: detectedMediaType,
        ocr: null,
        ogImgBlurUrl: null,
        screenshot: null,
        twitter_avatar_url: null,
        video_url: null,
        width: null,
      };
    }

    // Insert bookmark
    const { data: insertedData, error: insertError } = await supabase
      .from(MAIN_TABLE_NAME)
      .insert([
        {
          description: typeof metaData.img_caption === "string" ? metaData.img_caption : "",
          meta_data: toJson(metaData),
          ogImage,
          title: fileName,
          type: fileType,
          url: filePublicUrl,
          user_id: userId,
        },
      ])
      .select("id");

    if (insertError) {
      return apiError({
        error: insertError,
        extra: { fileName, fileType },
        message: "Error uploading file",
        operation: "insert_file_to_database",
        route: ROUTE,
        userId,
      });
    }

    if (isNullable(insertedData) || insertedData.length === 0) {
      return apiWarn({
        context: { fileName, userId },
        message: "No data returned after insert",
        route: ROUTE,
        status: 400,
      });
    }

    const [insertedBookmark] = insertedData;

    // Insert junction table entry
    const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
      bookmark_id: insertedBookmark.id,
      category_id: data.category_id,
      user_id: userId,
    });

    if (junctionError) {
      console.error(`[${ROUTE}] Error inserting category association:`, junctionError);
      Sentry.captureException(junctionError, {
        extra: { bookmarkId: insertedBookmark.id, categoryId: data.category_id },
        tags: { operation: "insert_bookmark_category_junction", userId },
      });
      // Non-blocking
    }

    // PDF: return early, no enrichment
    if (isPdf) {
      console.log(`[${ROUTE}] PDF file — skipping enrichment`);
      return apiSuccess({ data: insertedData, route: ROUTE, schema: UploadFileOutputSchema });
    }

    // Video: auto-assign collections, return early (video processing already done inline)
    if (isVideo) {
      if (insertedBookmark.id) {
        await autoAssignCollections({
          bookmarkId: insertedBookmark.id,
          matchedCollectionIds: videoMatchedCollectionIds,
          route: "upload-file",
          userId,
        });
      }

      console.log(`[${ROUTE}] Video file — enrichment done inline`);
      return apiSuccess({ data: insertedData, route: ROUTE, schema: UploadFileOutputSchema });
    }

    // Non-PDF, non-video: fire-and-forget enrichment via after()
    after(async () => {
      try {
        await uploadFileRemainingData({
          id: insertedBookmark.id,
          mediaType: detectedMediaType,
          publicUrl: filePublicUrl,
          supabase,
          userId,
        });
      } catch (error) {
        Sentry.captureException(error, {
          extra: { bookmarkId: insertedBookmark.id },
          tags: { operation: "after_upload_file_remaining_data", userId },
        });
      }
    });

    console.log(`[${ROUTE}] File uploaded, enrichment queued:`, {
      bookmarkId: insertedBookmark.id,
    });
    return apiSuccess({ data: insertedData, route: ROUTE, schema: UploadFileOutputSchema });
  } catch (error) {
    return apiError({
      error,
      message: "An unexpected error occurred",
      operation: "upload_file_unexpected",
      route: ROUTE,
    });
  }
}

export const POST = Object.assign(handlePost, {
  config: {
    factoryName: "createPostApiHandlerWithAuth",
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
    route: ROUTE,
  } satisfies HandlerConfig,
});
