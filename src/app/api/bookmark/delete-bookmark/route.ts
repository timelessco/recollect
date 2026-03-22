import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiWarn } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";

import { DeleteBookmarkInputSchema, DeleteBookmarkOutputSchema } from "./schema";

const ROUTE = "delete-bookmark";
const BATCH_SIZE = 1000;

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { deleteData } = data;
    const userId = user.id;
    const bookmarkIds = deleteData.map((item) => item.id);

    console.log(`[${route}] API called:`, {
      count: bookmarkIds.length,
      userId,
    });

    let totalDeleted = 0;
    let offset = 0;

    while (true) {
      const batch = bookmarkIds.slice(offset, offset + BATCH_SIZE);

      if (batch.length === 0) {
        break;
      }

      console.log(`[${route}] Deleting batch:`, {
        batchSize: batch.length,
        totalDeleted,
        userId,
      });

      const result = await deleteBookmarksByIds(supabase, batch, userId, route);

      if (result.error) {
        return apiWarn({
          context: { count: batch.length, totalDeleted },
          message: result.error,
          route,
          status: 500,
        });
      }

      totalDeleted += result.deletedCount;
      offset += batch.length;

      if (batch.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`[${route}] Completed:`, {
      deletedCount: totalDeleted,
      userId,
    });

    return {
      deletedCount: totalDeleted,
      message: `Deleted ${totalDeleted} bookmark(s)`,
    };
  },
  inputSchema: DeleteBookmarkInputSchema,
  outputSchema: DeleteBookmarkOutputSchema,
  route: ROUTE,
});
