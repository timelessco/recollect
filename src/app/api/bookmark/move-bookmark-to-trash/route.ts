import * as Sentry from "@sentry/nextjs";

import {
	MoveBookmarkToTrashInputSchema,
	MoveBookmarkToTrashOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "@/utils/constants";

const ROUTE = "move-bookmark-to-trash";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: MoveBookmarkToTrashInputSchema,
	outputSchema: MoveBookmarkToTrashOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { data: bookmarkData, isTrash } = data;
		const userId = user.id;

		// Extract bookmark IDs (Zod already validated these are numbers)
		const bookmarkIds = bookmarkData.map((item) => item.id);

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkIds,
			isTrash,
			count: bookmarkIds.length,
		});

		// This should never happen due to Zod validation, but double-check
		if (bookmarkIds.length === 0) {
			return apiWarn({
				route,
				message: "No valid bookmark IDs provided",
				status: 400,
				context: { bookmarkData },
			});
		}

		// Set trash to current timestamp when moving to trash, null when restoring
		const trashValue = isTrash ? new Date().toISOString() : null;

		const { data: updatedBookmarks, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ trash: trashValue })
			.in("id", bookmarkIds)
			.eq("user_id", userId)
			.select("id, trash");

		if (error) {
			return apiError({
				route,
				message: "Failed to move bookmarks to trash",
				error,
				operation: "update_bookmark_trash",
				userId,
				extra: { bookmarkIds, isTrash },
			});
		}

		// Check if any bookmarks were actually updated
		if (!updatedBookmarks || updatedBookmarks.length === 0) {
			console.warn(
				`[${route}] No bookmarks updated - may not exist or not owned by user:`,
				{
					userId,
					bookmarkIds,
				},
			);
		} else {
			console.log(
				`[${route}] Successfully ${isTrash ? "trashed" : "restored"} ${updatedBookmarks.length} bookmark(s)`,
			);

			// Trigger revalidation for public categories (non-blocking)
			// Get all category IDs associated with these bookmarks
			const { data: categoryAssociations } = await supabase
				.from(BOOKMARK_CATEGORIES_TABLE_NAME)
				.select("category_id")
				.in("bookmark_id", bookmarkIds);

			if (categoryAssociations && categoryAssociations.length > 0) {
				// Extract unique category IDs
				const categoryIds = [
					...new Set(categoryAssociations.map((assoc) => assoc.category_id)),
				];

				console.log(`[${route}] Triggering revalidation for categories:`, {
					categoryIds,
					bookmarkCount: updatedBookmarks.length,
				});

				// Non-blocking revalidation - don't await but catch errors
				revalidateCategoriesIfPublic(categoryIds, {
					operation: isTrash ? "bookmark_trashed" : "bookmark_restored",
					userId,
					// eslint-disable-next-line promise/prefer-await-to-then
				}).catch((error) => {
					console.error(`[${route}] Revalidation failed:`, {
						error,
						errorMessage:
							error instanceof Error
								? error.message
								: "revalidation failed in move-bookmark-to-trash",
						errorStack: error instanceof Error ? error.stack : undefined,
						categoryIds,
						userId,
						isTrash,
					});
					Sentry.captureException(error, {
						tags: { route: ROUTE },
						extra: { categoryIds, userId, operation: "revalidation", isTrash },
					});
				});
			}
		}

		return updatedBookmarks ?? [];
	},
});
