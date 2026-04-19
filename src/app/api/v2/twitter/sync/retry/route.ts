import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { TwitterSyncRetryInputSchema, TwitterSyncRetryOutputSchema } from "./schema";

const ROUTE = "v2-twitter-sync-retry";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }
      setPayload(ctx, {
        retry_mode: "msg_ids" in data ? "per_message" : "all",
        ...("msg_ids" in data ? { msg_id_count: data.msg_ids.length } : {}),
      });

      if ("msg_ids" in data) {
        if (ctx?.fields) {
          ctx.fields.msg_ids = data.msg_ids;
        }
        const { data: result, error: dbError } = await supabase.rpc("retry_twitter_import", {
          p_msg_ids: data.msg_ids,
          p_user_id: user.id,
        });

        if (dbError) {
          throw new RecollectApiError("service_unavailable", {
            cause: dbError,
            message: "Failed to retry imports",
            operation: "retry_imports",
          });
        }

        setPayload(ctx, { retry_completed: true });

        return result;
      }

      const { data: result, error: dbError } = await supabase.rpc("retry_all_twitter_imports", {
        p_user_id: user.id,
      });

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to retry all imports",
          operation: "retry_all_imports",
        });
      }

      setPayload(ctx, { retry_completed: true });

      return result;
    },
    inputSchema: TwitterSyncRetryInputSchema,
    outputSchema: TwitterSyncRetryOutputSchema,
    route: ROUTE,
  }),
);
