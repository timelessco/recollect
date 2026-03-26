import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { createPostApiHandlerWithSecret } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";

import { ProcessArchivedInputSchema, ProcessArchivedOutputSchema } from "./schema";

const ROUTE = "cron/process-archived";

const RpcResultSchema = z.object({
  requested: z.int().optional(),
  requeued: z.int(),
});

export const POST = createPostApiHandlerWithSecret({
  handler: async ({ input, route }) => {
    const supabase = createServerServiceClient();

    console.log(`[${route}] API called:`, { input });

    if ("retry_all" in input || "count" in input) {
      const count = "count" in input ? input.count : undefined;

      const { data, error } = await supabase.rpc(
        "admin_retry_ai_embeddings_archives",
        count !== undefined ? { p_count: count } : {},
      );

      if (error) {
        console.error(`[${route}] Error retrying archives:`, error);
        return apiError({
          error,
          message: "Failed to retry archived queue items",
          operation: "retry_archives_bulk",
          route,
        });
      }

      const rpcParsed = RpcResultSchema.safeParse(data);

      if (!rpcParsed.success) {
        console.error(`[${route}] Unexpected RPC response:`, data);
        Sentry.addBreadcrumb({
          category: "rpc-validation",
          data: { rawResponse: data },
          level: "warning",
          message: "Unexpected RPC response shape from admin_retry_ai_embeddings_archives",
        });
        return apiError({
          error: rpcParsed.error,
          message: "Unexpected response from retry operation",
          operation: "retry_archives_bulk_parse",
          route,
        });
      }

      return { requested: count ?? null, requeued: rpcParsed.data.requeued };
    }

    const { data, error } = await supabase.rpc("retry_ai_embeddings_archive", {
      p_msg_ids: input.msg_ids,
    });

    if (error) {
      console.error(`[${route}] Error retrying archives:`, error);
      return apiError({
        error,
        message: "Failed to retry archived queue items",
        operation: "retry_archives",
        route,
      });
    }

    const rpcParsed = RpcResultSchema.safeParse(data);

    if (!rpcParsed.success) {
      console.error(`[${route}] Unexpected RPC response:`, data);
      Sentry.addBreadcrumb({
        category: "rpc-validation",
        data: { rawResponse: data },
        level: "warning",
        message: "Unexpected RPC response shape from retry_ai_embeddings_archive",
      });
      return apiError({
        error: rpcParsed.error,
        message: "Unexpected response from retry operation",
        operation: "retry_archives_parse",
        route,
      });
    }

    return {
      requested: rpcParsed.data.requested ?? null,
      requeued: rpcParsed.data.requeued,
    };
  },
  inputSchema: ProcessArchivedInputSchema,
  outputSchema: ProcessArchivedOutputSchema,
  route: ROUTE,
  // process.env used intentionally — DEV_SUPABASE_SERVICE_KEY is not available in the factory
  secretEnvVar:
    process.env.NODE_ENV === "development" ? "DEV_SUPABASE_SERVICE_KEY" : "SUPABASE_SERVICE_KEY",
});
