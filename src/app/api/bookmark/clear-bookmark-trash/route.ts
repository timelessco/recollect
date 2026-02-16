import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { MAIN_TABLE_NAME } from "@/utils/constants";

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

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: ClearBookmarkTrashInputSchema,
	outputSchema: ClearBookmarkTrashOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const userId = user.id;

		// Get total count of trashed bookmarks first for logging
		const { count: trashCount, error: countError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.not("trash", "is", null);

		if (countError) {
			return apiError({
				route,
				message: "Failed to count trashed bookmarks",
				error: countError,
				operation: "clear_trash_count",
				userId,
			});
		}

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
			});

			const result = await deleteBookmarksByIds(
				supabase,
				bookmarkIds,
				userId,
				route,
			);

			if (result.error) {
				return apiWarn({
					route,
					message: result.error,
					status: 500,
					context: { count: bookmarkIds.length, totalDeleted },
				});
			}

			totalDeleted += result.deletedCount;

			console.log(`[${route}] Batch deleted:`, {
				userId,
				batchSize: result.deletedCount,
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
