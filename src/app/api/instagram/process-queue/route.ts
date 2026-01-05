import { z } from "zod";

import { processImportsQueue } from "../../../../lib/api-helpers/instagram/worker";

import { apiError, apiSuccess } from "@/lib/api-helpers/response";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "instagram-process-queue";

const ProcessQueueResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	messageId: z.number().nullable().optional(),
});

export type ProcessQueueResponse = z.infer<typeof ProcessQueueResponseSchema>;

export async function POST() {
	const queue_name = "imports";
	const batchSize = 100;
	try {
		console.log(`[${ROUTE}] API called:`, {
			queue_name,
			batchSize,
		});

		const supabase = createServiceClient();

		const result = await processImportsQueue(supabase, {
			queue_name,
			batchSize,
		});

		const message = !result?.messageId
			? "Queue is empty or all queue items are processed"
			: `Queue Id: ${result.messageId} processed successfully`;

		console.log(`[${ROUTE}] ${message}`);

		return apiSuccess({
			route: ROUTE,
			data: {
				success: true,
				message,
				messageId: result?.messageId ?? null,
			},
			schema: ProcessQueueResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "Error processing queue",
			error,
			operation: "process_queue",
		});
	}
}
