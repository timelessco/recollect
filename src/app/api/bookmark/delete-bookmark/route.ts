import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiWarn } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";

const ROUTE = "delete-bookmark";
const BATCH_SIZE = 1000;

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
			count: bookmarkIds.length,
		});

		let totalDeleted = 0;

		while (true) {
			const batch = bookmarkIds.slice(totalDeleted, totalDeleted + BATCH_SIZE);

			if (batch.length === 0) {
				break;
			}

			console.log(`[${route}] Deleting batch:`, {
				userId,
				batchSize: batch.length,
				totalDeleted,
			});

			const result = await deleteBookmarksByIds(supabase, batch, userId, route);

			if (result.error) {
				return apiWarn({
					route,
					message: result.error,
					status: 500,
					context: { count: batch.length, totalDeleted },
				});
			}

			totalDeleted += result.deletedCount;

			if (batch.length < BATCH_SIZE) {
				break;
			}
		}

		console.log(`[${route}] Completed:`, {
			userId,
			deletedCount: totalDeleted,
		});

		return {
			deletedCount: totalDeleted,
			message: `Deleted ${totalDeleted} bookmark(s)`,
		};
	},
});
