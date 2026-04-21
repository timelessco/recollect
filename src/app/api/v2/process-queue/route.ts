import { after } from "next/server";

import ky from "ky";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
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
      setPayload(ctx, { queue_name: "ai-embeddings" });

      const result = await processImageQueue(supabase, {
        batchSize: 1,
        queue_name: "ai-embeddings",
      });

      // AFTER operation — outcome
      if (ctx?.fields) {
        ctx.fields.message_id = result?.messageId ?? null;
      }
      setPayload(ctx, {
        queue_empty: !result?.messageId,
        processed_count: result?.messageId ? 1 : 0,
        background_task_count: result.backgroundTasks.length,
      });

      // Dispatch enrichment/screenshot fetches as registered background work.
      // Using after() (not bare void fetch in the worker) keeps Fluid Compute
      // from abandoning the socket before undici finishes, which was surfacing
      // as `TypeError: fetch failed` unhandled rejections in Sentry.
      for (const task of result.backgroundTasks) {
        after(async () => {
          try {
            await ky.post(task.url, {
              body: task.body,
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            logger.warn("[v2-process-queue] after() background dispatch failed", {
              error: error instanceof Error ? error.message : String(error),
              message_id: result.messageId,
              url: task.url,
            });
          }
        });
      }

      return { message: "Queue processed successfully" };
    },
    inputSchema: ProcessQueueInputSchema,
    outputSchema: ProcessQueueOutputSchema,
    route: ROUTE,
  }),
);
