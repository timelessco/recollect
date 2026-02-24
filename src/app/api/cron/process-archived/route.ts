import { z } from "zod";

import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "queue-archives-retry";

const InputSchema = z.union([
	z.object({ msg_ids: z.array(z.number()).min(1).max(100) }),
	z.object({ retry_all: z.literal(true) }),
	z.object({ count: z.int().min(1).max(1000) }),
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

		if ("retry_all" in input || "count" in input) {
			const count = "count" in input ? input.count : undefined;

			const { data, error } = await supabase.rpc(
				"admin_retry_ai_embeddings_archives",
				count !== undefined ? { p_count: count } : {},
			);

			if (error) {
				console.error(`[${route}] Error retrying archives:`, error);
				return apiError({
					route,
					message: "Failed to retry archived queue items",
					error,
					operation: "retry_archives_bulk",
				});
			}

			const result = data as { requeued: number };
			return { requeued: result.requeued, requested: count ?? null };
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
