import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { V2InstagramSyncInputSchema, V2InstagramSyncOutputSchema } from "./schema";

const ROUTE = "v2-instagram-sync";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmarks_count = data.bookmarks.length;
      }

      // In-memory deduplicate: remove exact URL duplicates within the batch
      const seen = new Set<string>();
      const uniqueBookmarks = data.bookmarks.filter((bookmark) => {
        if (seen.has(bookmark.url)) {
          return false;
        }

        seen.add(bookmark.url);
        return true;
      });

      const inMemorySkipped = data.bookmarks.length - uniqueBookmarks.length;

      if (ctx?.fields) {
        ctx.fields.in_memory_skipped = inMemorySkipped;
      }

      // Call transactional RPC for synchronous dedup + insert
      const serviceClient = createServerServiceClient();
      const { data: result, error: rpcError } = await serviceClient.rpc(
        "enqueue_instagram_bookmarks",
        {
          p_bookmarks: toJson(uniqueBookmarks),
          p_user_id: userId,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to insert bookmarks",
          operation: "enqueue_instagram_bookmarks",
        });
      }

      const parsed = V2InstagramSyncOutputSchema.safeParse(result);
      if (!parsed.success) {
        throw new RecollectApiError("service_unavailable", {
          context: { result },
          message: "Failed to insert bookmarks",
          operation: "enqueue_instagram_bookmarks",
        });
      }

      const { inserted } = parsed.data;
      const skipped = parsed.data.skipped + inMemorySkipped;

      if (ctx?.fields) {
        ctx.fields.inserted_count = inserted;
        ctx.fields.skipped_count = skipped;
        ctx.fields.enqueue_completed = true;
      }

      return { inserted, skipped };
    },
    inputSchema: V2InstagramSyncInputSchema,
    outputSchema: V2InstagramSyncOutputSchema,
    route: ROUTE,
  }),
);
