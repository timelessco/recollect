import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { type ImgMetadataType } from "@/types/apiTypes";
import { type Database } from "@/types/database.types";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
	STORAGE_SCRAPPED_IMAGES_PATH,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

const ROUTE = "clear-bookmark-trash";
const BATCH_SIZE = 1000;

// No input required — clears all trash for the authenticated user
const ClearBookmarkTrashInputSchema = z.object({});

export type ClearBookmarkTrashInput = z.infer<
	typeof ClearBookmarkTrashInputSchema
>;

const ClearBookmarkTrashOutputSchema = z.object({
	deletedCount: z.number(),
	message: z.string(),
});

export type ClearBookmarkTrashOutput = z.infer<
	typeof ClearBookmarkTrashOutputSchema
>;

/**
 * Extracts the filename from the end of a URL path.
 */
function extractFileName(url: string | null | undefined): string | undefined {
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
 * Deletes storage files (screenshots, og images, file uploads, videos) for a batch of bookmarks.
 */
async function deleteStorageForBookmarks(
	bookmarks: Array<{
		meta_data: unknown;
		ogImage: string | null;
		url: string | null;
	}>,
	userId: string,
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
			screenshotPaths.add(
				`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${ogFileName}`,
			);
		}

		if (screenshotFileName) {
			screenshotPaths.add(
				`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${screenshotFileName}`,
			);
		}

		// OG image paths (ogImage + meta_data.coverImage)
		if (ogFileName) {
			ogImagePaths.add(
				`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${ogFileName}`,
			);
		}

		if (coverImageFileName) {
			ogImagePaths.add(
				`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${coverImageFileName}`,
			);
		}

		// File image paths (thumbnails)
		if (ogFileName) {
			filePaths.push(`${STORAGE_FILES_PATH}/${userId}/${ogFileName}`);
		}

		// Video file paths
		if (urlFileName) {
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
		.filter(
			(result): result is PromiseRejectedResult => result.status === "rejected",
		)
		.map((result) => result.reason);

	if (errors.length > 0) {
		console.error(`[${ROUTE}] Storage cleanup errors:`, errors);
	}
}

/**
 * Deletes a batch of bookmarks: storage files, tags, and bookmark records.
 */
async function deleteBatch(
	supabase: SupabaseClient<Database>,
	bookmarkIds: number[],
	userId: string,
	route: string,
) {
	// Fetch fields needed for storage cleanup
	const { data: bookmarksForCleanup, error: fetchError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("ogImage, url, meta_data")
		.in("id", bookmarkIds)
		.eq("user_id", userId);

	if (fetchError) {
		console.error(`[${route}] Failed to fetch bookmarks for cleanup:`, {
			fetchError,
			bookmarkIds,
		});
		Sentry.captureException(fetchError, {
			tags: { operation: "clear_trash_fetch_cleanup", userId },
			extra: { bookmarkIds },
		});
	}

	// Clean up storage (non-blocking for the delete flow)
	if (bookmarksForCleanup && bookmarksForCleanup.length > 0) {
		await deleteStorageForBookmarks(bookmarksForCleanup, userId);
	}

	// Delete tags
	const { error: tagsError } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.in("bookmark_id", bookmarkIds)
		.eq("user_id", userId);

	if (tagsError) {
		console.error(`[${route}] Failed to delete tags:`, {
			tagsError,
			bookmarkIds,
		});
		Sentry.captureException(tagsError, {
			tags: { operation: "clear_trash_delete_tags", userId },
			extra: { bookmarkIds },
		});
	}

	// Delete bookmarks
	const { error: deleteError } = await supabase
		.from(MAIN_TABLE_NAME)
		.delete()
		.in("id", bookmarkIds)
		.eq("user_id", userId);

	if (deleteError) {
		console.error(`[${route}] Failed to delete bookmarks:`, {
			deleteError,
			bookmarkIds,
		});
		Sentry.captureException(deleteError, {
			tags: { operation: "clear_trash_delete_bookmarks", userId },
			extra: { bookmarkIds },
		});
		throw deleteError;
	}
}

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: ClearBookmarkTrashInputSchema,
	outputSchema: ClearBookmarkTrashOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const userId = user.id;

		// Get total count of trashed bookmarks first for logging
		const { count: trashCount } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.not("trash", "is", null);

		console.log(`[${route}] API called:`, {
			userId,
			trashCount: trashCount ?? 0,
		});

		if (!trashCount || trashCount === 0) {
			console.log(`[${route}] No bookmarks in trash, nothing to delete`);

			return {
				deletedCount: 0,
				message: "No bookmarks in trash to delete",
			};
		}

		let totalDeleted = 0;

		// Loop: fetch up to BATCH_SIZE trashed IDs, delete them, repeat until none left.
		// Supabase has a default row limit of 1000, so we use explicit .limit()
		while (true) {
			const { data: trashBookmarks, error: fetchError } = await supabase
				.from(MAIN_TABLE_NAME)
				.select("id")
				.eq("user_id", userId)
				.not("trash", "is", null)
				.limit(BATCH_SIZE);

			if (fetchError) {
				return apiError({
					route,
					message: "Failed to fetch trashed bookmarks",
					error: fetchError,
					operation: "clear_trash_fetch_ids",
					userId,
				});
			}

			if (!trashBookmarks || trashBookmarks.length === 0) {
				break;
			}

			const bookmarkIds = trashBookmarks.map((item) => item.id);

			console.log(`[${route}] Deleting batch:`, {
				userId,
				batchSize: bookmarkIds.length,
				bookmarkIds,
			});

			await deleteBatch(supabase, bookmarkIds, userId, route);

			totalDeleted += bookmarkIds.length;

			console.log(`[${route}] Batch deleted:`, {
				userId,
				batchSize: bookmarkIds.length,
				totalDeleted,
				remaining: trashCount - totalDeleted,
			});

			// If we got fewer than BATCH_SIZE, there are no more left
			if (trashBookmarks.length < BATCH_SIZE) {
				break;
			}
		}

		console.log(`[${route}] Completed:`, { userId, totalDeleted });

		return {
			deletedCount: totalDeleted,
			message: `Deleted ${totalDeleted} bookmarks`,
		};
	},
});
