import { after } from "next/server";

import ky, { HTTPError } from "ky";
import slugify from "slugify";

import type { StructuredKeywords, UserCollection } from "@/async/ai/schemas/image-analysis-schema";
import type { Database } from "@/types/database.types";
import type { AiToggles } from "@/utils/ai-feature-toggles";
import type { SupabaseClient } from "@supabase/supabase-js";

import { imageToText } from "@/async/ai/image-analysis";
import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { uploadFileRemainingData } from "@/lib/files/upload-file-remaining-data";
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
  V2_GET_MEDIA_TYPE_API,
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
    const json = await ky
      .get(`${getBaseUrl()}${NEXT_API_URL}/${V2_GET_MEDIA_TYPE_API}`, {
        searchParams: { url },
      })
      .json<unknown>();

    if (json !== null && json !== undefined && typeof json === "object" && "mediaType" in json) {
      const { mediaType } = json;
      return typeof mediaType === "string" ? mediaType : null;
    }

    return null;
  } catch (error) {
    const ctx = getServerContext();
    if (error instanceof HTTPError) {
      setPayload(ctx, {
        media_type_error: "upstream_not_ok",
        media_type_status: error.response.status,
      });
    } else {
      setPayload(ctx, {
        media_type_error: error instanceof Error ? error.message : String(error),
      });
    }
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
  // Missing thumbnail is degraded, not fatal: client-side codecs/CORS can fail
  // on legitimate videos. The bookmark still gets created with a null ogImage,
  // and the rendering layer falls back to the type-icon placeholder.
  const ctx = getServerContext();
  if (!thumbnailPath) {
    setPayload(ctx, { video_thumbnail_missing: true });
  }

  const { data: thumbnailUrl } = thumbnailPath
    ? storageHelpers.getPublicUrl(thumbnailPath)
    : { data: null };
  const ogImage = thumbnailUrl?.publicUrl ?? null;

  let imgData: { encoded?: null | string; height?: null | number; width?: null | number } = {};
  let ocrData: null | string = null;
  let ocrStatus: "limit_reached" | "no_text" | "success" = "no_text";
  let imageCaption: null | string = null;
  let imageKeywords: StructuredKeywords = {};
  let matchedCollectionIds: number[] = [];

  if (thumbnailUrl?.publicUrl) {
    try {
      imgData = await blurhashFromURL(thumbnailUrl.publicUrl);
    } catch (error) {
      setPayload(ctx, {
        blurhash_error: error instanceof Error ? error.message : String(error),
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
      imageKeywords = imageToTextResult?.image_keywords ?? {};
      matchedCollectionIds = imageToTextResult?.matched_collection_ids ?? [];
      ocrData = imageToTextResult?.ocr_text ?? null;
      ocrStatus = imageToTextResult?.ocr_text ? "success" : "no_text";
    } catch (error) {
      setPayload(ctx, {
        image_caption_error: error instanceof Error ? error.message : String(error),
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
    image_keywords: Object.keys(imageKeywords).length > 0 ? imageKeywords : undefined,
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

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { id: userId, email } = user;

      if (!email) {
        throw new RecollectApiError("bad_request", {
          message: "User email not available",
        });
      }

      const fileName = parseUploadFileName(data.name);
      const fileType = normalizeUploadedMimeType(data.type);

      // Populate ctx.fields BEFORE return — Pitfall #23: ALS is gone inside after().
      // These fields are the primary observability for this request, including
      // context needed to debug after() failures (bookmark_id, file_type
      // appear in the Axiom wide event even if after() throws).
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.category_id = data.category_id;
      }
      setPayload(ctx, { file_name: fileName, file_type: fileType });

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
          throw new RecollectApiError("forbidden", {
            message:
              "User is neither owner or collaborator for the collection or does not have edit access",
          });
        }
      }

      // Get public URL for the uploaded file (uploaded client-side to R2)
      const { data: storageData } = storageHelpers.getPublicUrl(storagePath);
      const filePublicUrl = storageData?.publicUrl;

      if (isNullable(filePublicUrl)) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Public URL not available"),
          message: "Error getting file URL",
          operation: "get_public_url",
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
            description: typeof metaData.img_caption === "string" ? metaData.img_caption : null,
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
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Error uploading file",
          operation: "insert_file_to_database",
        });
      }

      if (isNullable(insertedData) || insertedData.length === 0) {
        throw new RecollectApiError("bad_request", {
          message: "No data returned after insert",
        });
      }

      const [insertedBookmark] = insertedData;

      // Update ctx.fields with business fields now that we have the bookmark ID
      if (ctx?.fields) {
        ctx.fields.bookmark_id = insertedBookmark.id;
      }

      // Insert junction table entry
      const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
        bookmark_id: insertedBookmark.id,
        category_id: data.category_id,
        user_id: userId,
      });

      // Non-blocking — bookmark was created, junction failure is degraded but not fatal
      if (junctionError) {
        setPayload(ctx, {
          junction_error: junctionError.message,
          junction_error_code: junctionError.code,
        });
      }

      // PDF: return early, no enrichment
      if (isPdf) {
        return insertedData;
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

        return insertedData;
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
          // ALS is gone inside after() (Pitfall #23) — use logger directly.
          // The request-level Axiom event already has bookmark_id, file_type, category_id
          // from ctx.fields set BEFORE the return.
          logger.warn("[upload-file] after() enrichment failed", {
            bookmark_id: insertedBookmark.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      return insertedData;
    },
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
    route: ROUTE,
  }),
);
