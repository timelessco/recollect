import * as Sentry from "@sentry/nextjs";

import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { createServerServiceClient } from "@/lib/supabase/service";
import { processImageQueue } from "@/utils/worker";

import { ProcessQueueInputSchema, ProcessQueueOutputSchema } from "./schema";

const ROUTE = "v2-process-queue";

export const POST = createPostApiHandler({
  handler: async ({ route }) => {
    const supabase = createServerServiceClient();

    try {
      const result = await processImageQueue(supabase, {
        batchSize: 1,
        queue_name: "ai-embeddings",
      });

      console.log(
        `[${route}]`,
        !result?.messageId
          ? "Queue is empty or all items processed"
          : `Queue Id: ${result.messageId} processed successfully`,
      );

      return { message: "Queue processed successfully" };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: "process_queue" },
      });
      throw error;
    }
  },
  inputSchema: ProcessQueueInputSchema,
  outputSchema: ProcessQueueOutputSchema,
  route: ROUTE,
});
