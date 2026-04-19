import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { InstagramSyncStatusInputSchema, InstagramSyncStatusOutputSchema } from "./schema";

const ROUTE = "v2-instagram-sync-status";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const { data, error: dbError } = await supabase.rpc("get_instagram_sync_status", {
        p_user_id: user.id,
      });

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to get sync status",
          operation: "get_instagram_sync_status",
        });
      }

      const parsed = InstagramSyncStatusOutputSchema.parse(data);

      setPayload(ctx, {
        pending_count: parsed.pending,
        archived_count: parsed.archived,
      });

      return parsed;
    },
    inputSchema: InstagramSyncStatusInputSchema,
    outputSchema: InstagramSyncStatusOutputSchema,
    route: ROUTE,
  }),
);
