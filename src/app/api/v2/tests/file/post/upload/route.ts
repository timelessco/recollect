import { after } from "next/server";

import * as Sentry from "@sentry/nextjs";
import slugify from "slugify";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
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
    throw new Error(
      `ERROR: getError ${getError instanceof Error ? getError.message : JSON.stringify(getError)}`,
    );
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
      console.error("[v2-tests-file-post-upload] Blurhash error:", error);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { operation: "blur_hash" },
      });
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
    screenshot: null,
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

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const {
      category_id: categoryIdStr,
      name,
      thumbnailPath,
      type: fileType,
      uploadFileNamePath,
    } = data;
    const userId = user.id;
    const userEmail = user.email;

    console.log(`[${route}] API called:`, { categoryIdStr, name, userId });

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
          return apiError({
            error: categoryError,
            extra: { categoryId: numericCategoryId },
            message: "Failed to check category ownership",
            operation: "check_category_ownership",
            route,
            userId,
          });
        }

        if (categoryOwner?.user_id !== userId) {
          // Check if user is a collaborator with EDIT access
          const { data: collaboration } = await supabase
            .from(SHARED_CATEGORIES_TABLE_NAME)
            .select("id")
            .eq("category_id", numericCategoryId)
            .eq("email", userEmail ?? "")
            .eq("edit_access", true)
            .single();

          if (isNullable(collaboration)) {
            return apiWarn({
              message:
                "User is neither owner or collaborator for the collection or does not have edit access",
              route,
              status: 403,
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
      screenshot: null,
      twitter_avatar_url: null,
      video_url: null,
      width: null,
    };

    let ogImage: string | undefined;

    if (isVideo) {
      if (isNullable(thumbnailPath)) {
        return apiWarn({
          message: "thumbnailPath is required for video files",
          route,
          status: 400,
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
      return apiError({
        error: dbError,
        message: "Failed to insert bookmark",
        operation: "insert_bookmark",
        route,
        userId,
      });
    }

    if (isNullable(databaseData) || databaseData.length === 0) {
      return apiError({
        error: new Error("Insert returned no data"),
        message: "Failed to insert bookmark",
        operation: "insert_bookmark",
        route,
        userId,
      });
    }

    const bookmarkId = databaseData[0].id;

    // Add category association via junction table
    const { error: junctionError } = await supabase.from(BOOKMARK_CATEGORIES_TABLE_NAME).insert({
      bookmark_id: bookmarkId,
      category_id: categoryIdLogic,
      user_id: userId,
    });

    if (junctionError) {
      console.error(`[${route}] Error inserting category association:`, junctionError);
      Sentry.captureException(junctionError, {
        extra: { bookmarkId, categoryId: categoryIdLogic },
        tags: { operation: "insert_bookmark_category_junction" },
      });
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
          Sentry.captureException(error, {
            extra: { bookmarkId },
            tags: { operation: "remaining_upload_after", userId },
          });
        }
      });
    } else if (isVideo) {
      console.log(`[${route}] Skipping remaining-data processing for video file:`, { bookmarkId });
    } else {
      console.error(`[${route}] Remaining upload error: upload data is empty`);
      Sentry.captureException(new Error("Remaining upload error: upload data is empty"), {
        tags: { operation: "remaining_upload_api" },
      });
    }

    return { data: databaseData, error: null, success: true };
  },
  inputSchema: TestFileUploadInputSchema,
  outputSchema: TestFileUploadOutputSchema,
  route: ROUTE,
});
