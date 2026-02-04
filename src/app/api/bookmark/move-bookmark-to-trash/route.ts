import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "move-bookmark-to-trash";

// Input schema - array of bookmark objects with id
const BookmarkDataSchema = z.object({
	id: z.number({ error: "Bookmark ID must be a number" }),
});

const MoveBookmarkToTrashInputSchema = z.object({
	data: z
		.array(BookmarkDataSchema)
		.min(1, { message: "At least one bookmark is required" }),
	isTrash: z.boolean({ error: "isTrash must be a boolean" }),
});

export type MoveBookmarkToTrashInput = z.infer<
	typeof MoveBookmarkToTrashInputSchema
>;

// Output schema - array of updated bookmark records
const MoveBookmarkToTrashOutputSchema = z.array(
	z.object({
		id: z.number(),
		trash: z.string().nullable(),
	}),
);

export type MoveBookmarkToTrashOutput = z.infer<
	typeof MoveBookmarkToTrashOutputSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: MoveBookmarkToTrashInputSchema,
	outputSchema: MoveBookmarkToTrashOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { data: bookmarkData, isTrash } = data;
		const userId = user.id;

		// Extract and validate bookmark IDs
		const bookmarkIds = bookmarkData
			.map((item) => item.id)
			.filter((id): id is number => id !== undefined && id !== null);

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
		}

		return updatedBookmarks ?? [];
	},
});
