import * as Sentry from "@sentry/nextjs";

import { ProcessQueueInputSchema, ProcessQueueOutputSchema } from "./schema";
import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { createServiceClient } from "@/utils/supabaseClient";
import { processImageQueue } from "@/utils/worker";

const ROUTE = "v2-process-queue";

export const POST = createPostApiHandler({
	inputSchema: ProcessQueueInputSchema,
	outputSchema: ProcessQueueOutputSchema,
	route: ROUTE,
	handler: async ({ route }) => {
		const supabase = createServiceClient();

		try {
			const result = await processImageQueue(supabase, {
				queue_name: "ai-embeddings",
				batchSize: 1,
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
});
