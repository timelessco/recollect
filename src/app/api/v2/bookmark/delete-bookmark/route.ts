import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";

import { DeleteBookmarkInputSchema, DeleteBookmarkOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-delete-bookmark";
const BATCH_SIZE = 1000;

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { deleteData } = data;
      const userId = user.id;
      const bookmarkIds = deleteData.map((item) => item.id);

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { requested_count: bookmarkIds.length });

      let totalDeleted = 0;
      let offset = 0;

      while (true) {
        const batch = bookmarkIds.slice(offset, offset + BATCH_SIZE);

        if (batch.length === 0) {
          break;
        }

        const result = await deleteBookmarksByIds(supabase, batch, userId, ROUTE);

        if (result.error) {
          throw new RecollectApiError("service_unavailable", {
            cause: result.cause,
            context: { batch_size: batch.length, total_deleted: totalDeleted },
            message: result.error,
            operation: "delete_bookmark_batch",
          });
        }

        totalDeleted += result.deletedCount;
        offset += batch.length;

        if (batch.length < BATCH_SIZE) {
          break;
        }
      }

      setPayload(ctx, { deleted_count: totalDeleted, bookmarks_deleted: true });

      return {
        deletedCount: totalDeleted,
        message: `Deleted ${totalDeleted} bookmark(s)`,
      };
    },
    inputSchema: DeleteBookmarkInputSchema,
    outputSchema: DeleteBookmarkOutputSchema,
    route: ROUTE,
  }),
);
