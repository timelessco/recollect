import {
	DeleteBookmarkInputSchema,
	DeleteBookmarkOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiWarn } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";

const ROUTE = "delete-bookmark";
const BATCH_SIZE = 1000;

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
		let offset = 0;

		while (true) {
			const batch = bookmarkIds.slice(offset, offset + BATCH_SIZE);

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
			offset += batch.length;

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
