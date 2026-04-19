import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { V2TwitterSyncInputSchema, V2TwitterSyncOutputSchema } from "./schema";

const ROUTE = "v2-twitter-sync";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmarks_count = data.bookmarks.length;
      }

      // Call transactional RPC for synchronous dedup + insert
      const serviceClient = createServerServiceClient();
      const { data: result, error: rpcError } = await serviceClient.rpc(
        "enqueue_twitter_bookmarks",
        {
          p_bookmarks: toJson(data.bookmarks),
          p_user_id: userId,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to insert bookmarks",
          operation: "enqueue_twitter_bookmarks",
        });
      }

      const parsed = V2TwitterSyncOutputSchema.safeParse(result);
      if (!parsed.success) {
        throw new RecollectApiError("service_unavailable", {
          context: { result },
          message: "Failed to insert bookmarks",
          operation: "enqueue_twitter_bookmarks",
        });
      }

      if (ctx?.fields) {
        ctx.fields.inserted_count = parsed.data.inserted;
        ctx.fields.skipped_count = parsed.data.skipped;
        ctx.fields.enqueue_completed = true;
      }

      return parsed.data;
    },
    inputSchema: V2TwitterSyncInputSchema,
    outputSchema: V2TwitterSyncOutputSchema,
    route: ROUTE,
  }),
);
