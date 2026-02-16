import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";

const ROUTE = "delete-bookmark";

// Input schema - accepts deleteData array with bookmark IDs
const DeleteBookmarkInputSchema = z.object({
	deleteData: z
		.array(
			z.object({
				id: z.number({ error: "Bookmark ID must be a number" }),
			}),
		)
		.min(1, { message: "At least one bookmark is required" }),
});

export type DeleteBookmarkInput = z.infer<typeof DeleteBookmarkInputSchema>;

const DeleteBookmarkOutputSchema = z.object({
	deletedCount: z.number(),
	message: z.string(),
});

export type DeleteBookmarkOutput = z.infer<typeof DeleteBookmarkOutputSchema>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: DeleteBookmarkInputSchema,
	outputSchema: DeleteBookmarkOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { deleteData } = data;
		const userId = user.id;
		const bookmarkIds = deleteData.map((item) => item.id);

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkIds,
			count: bookmarkIds.length,
		});

		const result = await deleteBookmarksByIds(
			supabase,
			bookmarkIds,
			userId,
			route,
		);

		if (result.error) {
			return apiError({
				route,
				message: result.error,
				error: result.error,
				operation: "delete_bookmarks",
				userId,
				extra: { bookmarkIds },
			});
		}

		console.log(`[${route}] Completed:`, {
			userId,
			deletedCount: result.deletedCount,
		});

		return {
			deletedCount: result.deletedCount,
			message: `Deleted ${result.deletedCount} bookmark(s)`,
		};
	},
});
