import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { MAIN_TABLE_NAME } from "@/utils/constants";

import { ClearBookmarkTrashInputSchema, ClearBookmarkTrashOutputSchema } from "./schema";

const ROUTE = "clear-bookmark-trash";
const BATCH_SIZE = 1000;

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;

    // Get total count of trashed bookmarks first for logging
    const { count: trashCount, error: countError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("trash", "is", null);

    if (countError) {
      return apiError({
        error: countError,
        message: "Failed to count trashed bookmarks",
        operation: "clear_trash_count",
        route,
        userId,
      });
    }

    console.log(`[${route}] API called:`, {
      trashCount: trashCount ?? 0,
      userId,
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
          error: fetchError,
          message: "Failed to fetch trashed bookmarks",
          operation: "clear_trash_fetch_ids",
          route,
          userId,
        });
      }

      if (!trashBookmarks || trashBookmarks.length === 0) {
        break;
      }

      const bookmarkIds = trashBookmarks.map((item) => item.id);

      console.log(`[${route}] Deleting batch:`, {
        batchSize: bookmarkIds.length,
        userId,
      });

      const result = await deleteBookmarksByIds(supabase, bookmarkIds, userId, route);

      if (result.error) {
        return apiWarn({
          context: { count: bookmarkIds.length, totalDeleted },
          message: result.error,
          route,
          status: 500,
        });
      }

      totalDeleted += result.deletedCount;

      console.log(`[${route}] Batch deleted:`, {
        batchSize: result.deletedCount,
        remaining: trashCount - totalDeleted,
        totalDeleted,
        userId,
      });

      // If we got fewer than BATCH_SIZE, there are no more left
      if (trashBookmarks.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`[${route}] Completed:`, { totalDeleted, userId });

    return {
      deletedCount: totalDeleted,
      message: `Deleted ${totalDeleted} bookmarks`,
    };
  },
  inputSchema: ClearBookmarkTrashInputSchema,
  outputSchema: ClearBookmarkTrashOutputSchema,
  route: ROUTE,
});
