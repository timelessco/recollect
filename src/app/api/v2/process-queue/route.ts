import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { processImageQueue } from "@/utils/worker";

import { ProcessQueueInputSchema, ProcessQueueOutputSchema } from "./schema";

const ROUTE = "v2-process-queue";

export const POST = createAxiomRouteHandler(
  withPublic({
    handler: async () => {
      const supabase = createServerServiceClient();

      // BEFORE operation — input context
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.queue_name = "ai-embeddings";
      }

      const result = await processImageQueue(supabase, {
        batchSize: 1,
        queue_name: "ai-embeddings",
      });

      // AFTER operation — outcome
      if (ctx?.fields) {
        ctx.fields.message_id = result?.messageId ?? null;
        ctx.fields.queue_empty = !result?.messageId;
        ctx.fields.processed_count = result?.messageId ? 1 : 0;
      }

      return { message: "Queue processed successfully" };
    },
    inputSchema: ProcessQueueInputSchema,
    outputSchema: ProcessQueueOutputSchema,
    route: ROUTE,
  }),
);
