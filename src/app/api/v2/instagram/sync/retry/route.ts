import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { V2InstagramSyncRetryInputSchema, V2InstagramSyncRetryOutputSchema } from "./schema";

const ROUTE = "v2-instagram-sync-retry";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.retry_mode = "msg_ids" in data ? "per_message" : "all";
        if ("msg_ids" in data) {
          ctx.fields.msg_ids_count = data.msg_ids.length;
        }
      }

      if ("msg_ids" in data) {
        const { data: result, error } = await supabase.rpc("retry_instagram_import", {
          p_msg_ids: data.msg_ids,
          p_user_id: user.id,
        });

        if (error) {
          throw new RecollectApiError("service_unavailable", {
            cause: error,
            message: "Failed to retry imports",
            operation: "retry_imports",
          });
        }

        if (ctx?.fields) {
          ctx.fields.retry_completed = true;
        }

        return result;
      }

      const { data: result, error } = await supabase.rpc("retry_all_instagram_imports", {
        p_user_id: user.id,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to retry all imports",
          operation: "retry_all_imports",
        });
      }

      if (ctx?.fields) {
        ctx.fields.retry_completed = true;
      }

      return result;
    },
    inputSchema: V2InstagramSyncRetryInputSchema,
    outputSchema: V2InstagramSyncRetryOutputSchema,
    route: ROUTE,
  }),
);
