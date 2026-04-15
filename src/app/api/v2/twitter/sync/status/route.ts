import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { TwitterSyncStatusInputSchema, TwitterSyncStatusOutputSchema } from "./schema";

const ROUTE = "v2-twitter-sync-status";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const { data, error: dbError } = await supabase.rpc("get_twitter_sync_status", {
        p_user_id: user.id,
      });

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to get sync status",
          operation: "get_twitter_sync_status",
        });
      }

      if (ctx?.fields) {
        ctx.fields.sync_status_fetched = true;
      }

      return data;
    },
    inputSchema: TwitterSyncStatusInputSchema,
    outputSchema: TwitterSyncStatusOutputSchema,
    route: ROUTE,
  }),
);
