import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import {
  ChromeBookmarkImportRetryInputSchema as RetryInputSchema,
  ChromeBookmarkImportRetryOutputSchema as RetryOutputSchema,
} from "./schema";

const ROUTE = "v2-chrome-bookmark-import-retry";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      if ("msg_ids" in data) {
        if (ctx?.fields) {
          ctx.fields.retry_mode = "selective";
          ctx.fields.msg_ids = data.msg_ids;
        }

        const { data: result, error } = await supabase.rpc("retry_chrome_bookmark_import", {
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

        return result;
      }

      if (ctx?.fields) {
        ctx.fields.retry_mode = "all";
      }

      const { data: result, error } = await supabase.rpc("retry_all_chrome_bookmark_imports", {
        p_user_id: user.id,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to retry all imports",
          operation: "retry_all_imports",
        });
      }

      return result;
    },
    inputSchema: RetryInputSchema,
    outputSchema: RetryOutputSchema,
    route: ROUTE,
  }),
);
