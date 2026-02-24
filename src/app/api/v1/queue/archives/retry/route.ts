import { z } from "zod";

import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "queue-archives-retry";

const InputSchema = z.union([
	z.object({ msg_ids: z.array(z.number()).min(1).max(100) }),
	z.object({ retry_all: z.literal(true) }),
]);

const OutputSchema = z.object({
	requeued: z.number(),
	requested: z.number().nullable(),
});

export const POST = createPostApiHandler({
	route: ROUTE,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
	handler: async ({ input, route }) => {
		const supabase = createServiceClient();

		if ("retry_all" in input) {
			const { data, error } = await supabase.rpc(
				"admin_retry_all_ai_embeddings_archives",
			);

			if (error) {
				console.error(`[${route}] Error retrying all archives:`, error);
				return apiError({
					route,
					message: "Failed to retry all archived queue items",
					error,
					operation: "retry_all_archives",
				});
			}

			const result = data as { requeued: number };
			return { requeued: result.requeued, requested: null };
		}

		const { data, error } = await supabase.rpc("retry_ai_embeddings_archive", {
			p_msg_ids: input.msg_ids,
		});

		if (error) {
			console.error(`[${route}] Error retrying archives:`, error);
			return apiError({
				route,
				message: "Failed to retry archived queue items",
				error,
				operation: "retry_archives",
			});
		}

		const result = data as { requeued: number; requested: number };
		return { requeued: result.requeued, requested: result.requested };
	},
});
