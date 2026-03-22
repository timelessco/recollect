import * as Sentry from "@sentry/nextjs";

import type { ImgMetadataType } from "@/types/apiTypes";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
  R2_MAIN_BUCKET_NAME,
  STORAGE_FILES_PATH,
  STORAGE_SCRAPPED_IMAGES_PATH,
  STORAGE_SCREENSHOT_IMAGES_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

/**
 * Extracts the filename from the end of a URL path.
 */
function extractFileName(url: null | string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const lastSlashIndex = url.lastIndexOf("/");

  if (lastSlashIndex === -1) {
    return url;
  }

  return url.slice(lastSlashIndex + 1) || undefined;
}

/**
 * Deletes storage files (screenshots, og images, file uploads, videos) for a set of bookmarks.
 */
async function deleteStorageForBookmarks(
  bookmarks: {
    meta_data: unknown;
    ogImage: null | string;
    type: string;
    url: null | string;
  }[],
  userId: string,
  route: string,
) {
  const screenshotPaths = new Set<string>();
  const ogImagePaths = new Set<string>();
  const filePaths: string[] = [];
  const videoPaths: string[] = [];

  for (const item of bookmarks) {
    const ogFileName = extractFileName(item.ogImage);
    const metaData = item.meta_data as ImgMetadataType | null;
    const screenshotFileName = extractFileName(metaData?.screenshot);
    const coverImageFileName = extractFileName(metaData?.coverImage);
    const urlFileName = extractFileName(item.url);

    // Screenshot image paths (ogImage + meta_data.screenshot)
    if (ogFileName) {
      screenshotPaths.add(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${ogFileName}`);
    }

    if (screenshotFileName) {
      screenshotPaths.add(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${screenshotFileName}`);
    }

    // OG image paths (ogImage + meta_data.coverImage)
    if (ogFileName) {
      ogImagePaths.add(`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${ogFileName}`);
    }

    if (coverImageFileName) {
      ogImagePaths.add(`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${coverImageFileName}`);
    }

    // Additional images (stored under screenshot_imgs)
    if (metaData?.additionalImages) {
      for (const imageUrl of metaData.additionalImages) {
        const fileName = extractFileName(imageUrl);
        if (fileName) {
          screenshotPaths.add(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${fileName}`);
        }
      }
    }

    // Additional videos (stored under screenshot_imgs)
    if (metaData?.additionalVideos) {
      for (const videoUrl of metaData.additionalVideos) {
        const fileName = extractFileName(videoUrl);
        if (fileName) {
          screenshotPaths.add(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${fileName}`);
        }
      }
    }

    // File image paths (thumbnails)
    if (ogFileName) {
      filePaths.push(`${STORAGE_FILES_PATH}/${userId}/${ogFileName}`);
    }

    // Video file paths
    if (urlFileName && item.type?.includes("video")) {
      videoPaths.push(`${STORAGE_FILES_PATH}/${userId}/${urlFileName}`);
    }
  }

  const results = await Promise.allSettled([
    storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, [...screenshotPaths]),
    storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, [...ogImagePaths]),
    storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, filePaths),
    storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, videoPaths),
  ]);

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);

  if (errors.length > 0) {
    console.error(`[${route}] Storage cleanup errors:`, errors);
  }
}

interface DeleteBookmarksByIdsResult {
  deletedCount: number;
  error: null | string;
}

/**
 * Cascading delete for bookmarks: cleans up storage files, tags, and bookmark records.
 * This is the single source of truth for bookmark deletion logic.
 * @param supabase - Authenticated Supabase client
 * @param bookmarkIds - Array of bookmark IDs to delete
 * @param userId - The authenticated user's ID
 * @param route - Route name for logging
 * @returns Result with deleted count and optional error
 */
export async function deleteBookmarksByIds(
  supabase: SupabaseClient<Database>,
  bookmarkIds: number[],
  userId: string,
  route: string,
): Promise<DeleteBookmarksByIdsResult> {
  if (bookmarkIds.length === 0) {
    return { deletedCount: 0, error: null };
  }

  // Fetch only the fields needed for storage cleanup
  const { data: bookmarksForCleanup, error: fetchError } = await supabase
    .from(MAIN_TABLE_NAME)
    .select("ogImage, url, meta_data, type")
    .in("id", bookmarkIds)
    .eq("user_id", userId);

  if (fetchError) {
    console.error(`[${route}] Failed to fetch bookmarks for cleanup:`, {
      count: bookmarkIds.length,
      fetchError,
    });
    Sentry.captureException(fetchError, {
      extra: { count: bookmarkIds.length },
      tags: { operation: `${route}_fetch_cleanup`, userId },
    });
  }

  // Clean up storage files
  if (bookmarksForCleanup && bookmarksForCleanup.length > 0) {
    await deleteStorageForBookmarks(
      bookmarksForCleanup as {
        meta_data: unknown;
        ogImage: null | string;
        type: string;
        url: null | string;
      }[],
      userId,
      route,
    );
  }

  // Delete tags
  const { error: tagsError } = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .in("bookmark_id", bookmarkIds)
    .eq("user_id", userId);

  if (tagsError) {
    console.error(`[${route}] Failed to delete tags:`, {
      count: bookmarkIds.length,
      tagsError,
    });
    Sentry.captureException(tagsError, {
      extra: { count: bookmarkIds.length },
      tags: { operation: `${route}_delete_tags`, userId },
    });
  }

  // Delete bookmarks
  const { data: deletedBookmarks, error: deleteError } = await supabase
    .from(MAIN_TABLE_NAME)
    .delete()
    .in("id", bookmarkIds)
    .eq("user_id", userId)
    .select("id");

  if (deleteError) {
    console.error(`[${route}] Failed to delete bookmarks:`, {
      count: bookmarkIds.length,
      deleteError,
    });
    Sentry.captureException(deleteError, {
      extra: { count: bookmarkIds.length },
      tags: { operation: `${route}_delete_bookmarks`, userId },
    });

    return { deletedCount: 0, error: "Failed to delete bookmarks" };
  }

  return { deletedCount: deletedBookmarks?.length ?? 0, error: null };
}
