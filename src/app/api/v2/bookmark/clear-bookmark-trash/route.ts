import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { MAIN_TABLE_NAME } from "@/utils/constants";

import { ClearBookmarkTrashInputSchema, ClearBookmarkTrashOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-clear-bookmark-trash";
const BATCH_SIZE = 1000;

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      // Get total count of trashed bookmarks first for observability
      const { count: trashCount, error: countError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("trash", "is", null);

      if (countError) {
        throw new RecollectApiError("service_unavailable", {
          cause: countError,
          message: "Failed to count trashed bookmarks",
          operation: "clear_trash_count",
        });
      }

      setPayload(ctx, { trash_count: trashCount ?? 0 });

      if (!trashCount || trashCount === 0) {
        setPayload(ctx, { deleted_count: 0, empty_trash: true });

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
          throw new RecollectApiError("service_unavailable", {
            cause: fetchError,
            context: { total_deleted: totalDeleted },
            message: "Failed to fetch trashed bookmarks",
            operation: "clear_trash_fetch_ids",
          });
        }

        if (!trashBookmarks || trashBookmarks.length === 0) {
          break;
        }

        const bookmarkIds = trashBookmarks.map((item) => item.id);

        const result = await deleteBookmarksByIds(supabase, bookmarkIds, userId, ROUTE);

        if (result.error) {
          throw new RecollectApiError("service_unavailable", {
            cause: result.cause,
            context: { batch_size: bookmarkIds.length, total_deleted: totalDeleted },
            message: result.error,
            operation: "clear_trash_delete_batch",
          });
        }

        totalDeleted += result.deletedCount;

        // If we got fewer than BATCH_SIZE, there are no more left
        if (trashBookmarks.length < BATCH_SIZE) {
          break;
        }
      }

      setPayload(ctx, { deleted_count: totalDeleted, trash_cleared: true });

      return {
        deletedCount: totalDeleted,
        message: `Deleted ${totalDeleted} bookmarks`,
      };
    },
    inputSchema: ClearBookmarkTrashInputSchema,
    outputSchema: ClearBookmarkTrashOutputSchema,
    route: ROUTE,
  }),
);
