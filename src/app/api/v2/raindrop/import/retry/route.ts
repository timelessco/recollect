import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { RaindropImportRetryInputSchema, RaindropImportRetryOutputSchema } from "./schema";

// Route identifier used by Axiom wide events and OpenAPI scanner.
// Caller constant: V2_RAINDROP_IMPORT_RETRY_API in `src/utils/constants.ts` -> "v2/raindrop/import/retry".
const ROUTE = "v2-raindrop-import-retry";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.retry_mode = "msg_ids" in data ? "per_message" : "all";
      }

      if ("msg_ids" in data) {
        if (ctx?.fields) {
          ctx.fields.requested_count = data.msg_ids.length;
        }

        const { data: result, error } = await supabase.rpc("retry_raindrop_import", {
          p_msg_ids: data.msg_ids,
          p_user_id: user.id,
        });

        if (error) {
          throw new RecollectApiError("service_unavailable", {
            cause: error,
            message: "Failed to retry imports",
            operation: "retry_raindrop_import",
          });
        }

        if (
          ctx?.fields &&
          result &&
          typeof result === "object" &&
          "requeued" in result &&
          typeof result.requeued === "number"
        ) {
          ctx.fields.requeued_count = result.requeued;
        }

        return result;
      }

      const { data: result, error } = await supabase.rpc("retry_all_raindrop_imports", {
        p_user_id: user.id,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to retry all imports",
          operation: "retry_all_raindrop_imports",
        });
      }

      if (
        ctx?.fields &&
        result &&
        typeof result === "object" &&
        "requeued" in result &&
        typeof result.requeued === "number"
      ) {
        ctx.fields.requeued_count = result.requeued;
      }

      return result;
    },
    inputSchema: RaindropImportRetryInputSchema,
    outputSchema: RaindropImportRetryOutputSchema,
    route: ROUTE,
  }),
);
