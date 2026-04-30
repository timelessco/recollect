import { z } from "zod";

import { createAxiomRouteHandler, withSecret } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";

import { ProcessArchivedInputSchema, ProcessArchivedOutputSchema } from "./schema";

const ROUTE = "v2-cron-process-archived";

const RpcResultSchema = z.object({
  requested: z.int().optional(),
  requeued: z.int(),
});

export const POST = createAxiomRouteHandler(
  withSecret({
    handler: async ({ input }) => {
      const ctx = getServerContext();
      const supabase = createServerServiceClient();

      if ("retry_all" in input || "count" in input) {
        const count = "count" in input ? input.count : undefined;

        setPayload(ctx, {
          mode: "retry_all" in input ? "retry_all" : "retry_by_count",
          ...(count !== undefined ? { requested_count: count } : {}),
        });

        const { data, error } = await supabase.rpc(
          "admin_retry_ai_embeddings_archives",
          count !== undefined ? { p_count: count } : {},
        );

        if (error) {
          throw new RecollectApiError("service_unavailable", {
            cause: error,
            message: "Failed to retry archived queue items",
            operation: "retry_archives_bulk",
          });
        }

        const rpcParsed = RpcResultSchema.safeParse(data);

        if (!rpcParsed.success) {
          setPayload(ctx, { rpc_raw_response: data });
          throw new RecollectApiError("service_unavailable", {
            cause: rpcParsed.error,
            message: "Unexpected response from retry operation",
            operation: "retry_archives_bulk_parse",
          });
        }

        setPayload(ctx, { requeued_count: rpcParsed.data.requeued });

        return { requested: count ?? null, requeued: rpcParsed.data.requeued };
      }

      setPayload(ctx, {
        mode: "retry_by_ids",
        requested_count: input.msg_ids.length,
      });

      const { data, error } = await supabase.rpc("retry_ai_embeddings_archive", {
        p_msg_ids: input.msg_ids,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to retry archived queue items",
          operation: "retry_archives",
        });
      }

      const rpcParsed = RpcResultSchema.safeParse(data);

      if (!rpcParsed.success) {
        setPayload(ctx, { rpc_raw_response: data });
        throw new RecollectApiError("service_unavailable", {
          cause: rpcParsed.error,
          message: "Unexpected response from retry operation",
          operation: "retry_archives_parse",
        });
      }

      setPayload(ctx, { requeued_count: rpcParsed.data.requeued });

      return {
        requested: input.msg_ids.length,
        requeued: rpcParsed.data.requeued,
      };
    },
    inputSchema: ProcessArchivedInputSchema,
    outputSchema: ProcessArchivedOutputSchema,
    route: ROUTE,
    // process.env used intentionally — DEV_SUPABASE_SERVICE_KEY is not available in the factory
    secretEnvVar:
      process.env.NODE_ENV === "development" ? "DEV_SUPABASE_SERVICE_KEY" : "SUPABASE_SERVICE_KEY",
  }),
);
