import { after } from "next/server";

import slugify from "slugify";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { uploadFileRemainingData } from "@/lib/files/upload-file-remaining-data";
import { isNullable } from "@/utils/assertion-utils";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  FILE_NAME_PARSING_PATTERN,
  MAIN_TABLE_NAME,
  R2_MAIN_BUCKET_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  STORAGE_FILES_PATH,
} from "@/utils/constants";
import { blurhashFromURL } from "@/utils/getBlurHash";
import { storageHelpers } from "@/utils/storageClient";
import { toJson } from "@/utils/type-utils";

import { TestFileUploadInputSchema, TestFileUploadOutputSchema } from "./schema";

const ROUTE = "v2-tests-file-post-upload";

/**
 * Video-specific logic: processes thumbnail, generates blurhash metadata.
 * Ported from v1's videoLogic function.
 */
async function processVideoThumbnail(props: {
  fileName: string;
  thumbnailPath: string;
  userId: string;
}): Promise<{
  meta_data: Record<string, unknown>;
  ogImage: string | undefined;
}> {
  const { fileName, thumbnailPath, userId } = props;

  const finalThumbnailPath = `${STORAGE_FILES_PATH}/${userId}/thumbnail-${fileName}.png`;

  // Verify thumbnail exists in storage
  const { error: getError } = await storageHelpers.listObjects(R2_MAIN_BUCKET_NAME, thumbnailPath);

  if (getError) {
    throw new RecollectApiError("service_unavailable", {
      cause: getError instanceof Error ? getError : undefined,
      message: "Failed to verify thumbnail in storage",
      operation: "test_upload_thumbnail",
    });
  }

  // Delete the temp thumbnail
  await storageHelpers.deleteObject(R2_MAIN_BUCKET_NAME, thumbnailPath);

  // Get public URL for the final thumbnail
  const { data: thumbnailUrl } = storageHelpers.getPublicUrl(finalThumbnailPath);

  const ogImage = thumbnailUrl.publicUrl;

  let imgData: {
    encoded?: null | string;
    height?: null | number;
    width?: null | number;
  } = {};

  if (thumbnailUrl.publicUrl) {
    try {
      imgData = await blurhashFromURL(thumbnailUrl.publicUrl);
    } catch (error) {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.blurhash_error = error instanceof Error ? error.message : String(error);
      }
      imgData = {};
    }
  }

  const meta_data = {
    coverImage: null,
    favIcon: null,
    height: imgData.height ?? null,
    iframeAllowed: false,
    image_caption: null,
    img_caption: null,
    isOgImagePreferred: false,
    isPageScreenshot: null,
    mediaType: "",
    ocr: null,
    ogImgBlurUrl: imgData.encoded ?? null,
    twitter_avatar_url: null,
    video_url: null,
    width: imgData.width ?? null,
  };

  return { meta_data, ogImage };
}

/** Parse upload file name — removes special characters via slugify */
function parseUploadFileName(name: string): string {
  return slugify(name || "", {
    lower: true,
    remove: FILE_NAME_PARSING_PATTERN,
  });
}

/** Check if the category_id represents a real user category (not a special page) */
function isUserInACategory(categoryId: string): boolean {
  const nonCategoryPages = [
    "everything",
    "uncategorized",
    "inbox",
    "search",
    "trash",
    "images",
    "videos",
    "audio",
    "documents",
    "links",
    "tweets",
    "instagram",
    "discover",
  ];

  return !nonCategoryPages.includes(categoryId);
}

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const {
        category_id: categoryIdStr,
        name,
        thumbnailPath,
        type: fileType,
        uploadFileNamePath,
      } = data;
      const userId = user.id;
      const userEmail = user.email;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.file_type = fileType;
        ctx.fields.operation = "test_upload";
      }

      // Determine numeric category ID (0 = Uncategorized)
      let categoryIdLogic = 0;
      if (categoryIdStr) {
        categoryIdLogic = isUserInACategory(categoryIdStr) ? Number(categoryIdStr) : 0;
      }

      // Inline category ownership/collaboration check (only for real categories)
      if (Number.parseInt(categoryIdStr, 10) !== 0 && typeof categoryIdStr === "string") {
        const numericCategoryId = Number(categoryIdStr);

        if (!Number.isNaN(numericCategoryId) && numericCategoryId > 0) {
          // Check if user owns the category
          const { data: categoryOwner, error: categoryError } = await supabase
            .from(CATEGORIES_TABLE_NAME)
            .select("user_id")
            .eq("id", numericCategoryId)
            .single();

          if (categoryError) {
            throw new RecollectApiError("service_unavailable", {
              cause: categoryError,
              message: "Failed to check category ownership",
              operation: "check_category_ownership",
            });
          }

          if (categoryOwner?.user_id !== userId) {
            // Check if user is a collaborator with EDIT access
            const { data: collaboration, error: collaborationError } = await supabase
              .from(SHARED_CATEGORIES_TABLE_NAME)
              .select("id")
              .eq("category_id", numericCategoryId)
              .eq("email", userEmail ?? "")
              .eq("edit_access", true)
              .single();

            // PGRST116 = "no rows returned" — expected when user isn't a collaborator
            if (collaborationError && collaborationError.code !== "PGRST116") {
              throw new RecollectApiError("service_unavailable", {
                cause: collaborationError,
                message: "Failed to check collaborator access",
                operation: "check_collaborator_access",
              });
            }

            if (isNullable(collaboration)) {
              throw new RecollectApiError("forbidden", {
                message:
                  "User is neither owner or collaborator for the collection or does not have edit access",
                operation: "check_collaborator_access",
              });
            }
          }
        }
      }

      // Get storage path and public URL
      const uploadPath = parseUploadFileName(uploadFileNamePath);
      const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;
      const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

      // Process video vs non-video
      const isVideo = fileType?.includes("video");
      const fileName = parseUploadFileName(name);

      let meta_data: Record<string, unknown> = {
        coverImage: null,
        favIcon: null,
        height: null,
        iframeAllowed: false,
        image_caption: null,
        img_caption: null,
        isOgImagePreferred: false,
        isPageScreenshot: null,
        mediaType: "",
        ocr: null,
        ogImgBlurUrl: null,
        twitter_avatar_url: null,
        video_url: null,
        width: null,
      };

      let ogImage: string | undefined;

      if (isVideo) {
        if (isNullable(thumbnailPath)) {
          throw new RecollectApiError("bad_request", {
            message: "thumbnailPath is required for video files",
            operation: "validate_thumbnail",
          });
        }

        const videoResult = await processVideoThumbnail({
          fileName: uploadPath,
          thumbnailPath,
          userId,
        });

        ({ ogImage } = videoResult);
        ({ meta_data } = videoResult);
      } else {
        ogImage = storageData.publicUrl;
      }

      // Insert bookmark into database
      const { data: databaseData, error: dbError } = await supabase
        .from(MAIN_TABLE_NAME)
        .insert({
          description: "",
          meta_data: toJson(meta_data),
          ogImage,
          title: fileName,
          type: fileType,
          url: storageData.publicUrl,
          user_id: userId,
        })
        .select("id");

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to insert bookmark",
          operation: "insert_bookmark",
        });
      }

      if (isNullable(databaseData) || databaseData.length === 0) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Insert returned no data"),
          message: "Failed to insert bookmark",
          operation: "insert_bookmark",
        });
      }

      const bookmarkId = databaseData[0].id;

      if (ctx?.fields) {
        ctx.fields.bookmark_id = bookmarkId;
      }

      // Add category association via junction table
      const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
        bookmark_id: bookmarkId,
        category_id: categoryIdLogic,
        user_id: userId,
      });

      if (junctionError && ctx?.fields) {
        ctx.fields.junction_error = true;
        ctx.fields.junction_error_code = junctionError.code;
      }

      // Fire remaining-data processing for non-video files
      if (!isVideo && databaseData.length > 0) {
        after(async () => {
          try {
            await uploadFileRemainingData({
              id: bookmarkId,
              mediaType: fileType,
              publicUrl: storageData.publicUrl,
              supabase,
              userId,
            });
          } catch (error) {
            // ALS gone inside after() — use logger directly
            logger.warn("[tests-upload] after() enrichment failed", {
              bookmark_id: bookmarkId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      } else if (!isVideo && ctx?.fields) {
        ctx.fields.remaining_upload_empty = true;
      }

      return databaseData;
    },
    inputSchema: TestFileUploadInputSchema,
    outputSchema: TestFileUploadOutputSchema,
    route: ROUTE,
  }),
);
