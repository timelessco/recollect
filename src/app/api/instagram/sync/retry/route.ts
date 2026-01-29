import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "instagram-sync-retry";

const RetryInputSchema = z.union([
	z.object({ msg_ids: z.array(z.number()).min(1).max(100) }),
	z.object({ all: z.literal(true) }),
]);

const RetryOutputSchema = z.object({
	requeued: z.number(),
	requested: z.number().optional(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RetryInputSchema,
	outputSchema: RetryOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		if ("msg_ids" in data) {
			const { data: result, error } = await supabase.rpc(
				"retry_instagram_import",
				{
					p_user_id: user.id,
					p_msg_ids: data.msg_ids,
				},
			);

			if (error) {
				console.error(`[${route}] Retry error:`, error);
				return apiError({
					route,
					message: "Failed to retry imports",
					error,
					operation: "retry_imports",
					userId: user.id,
				});
			}

			return result;
		}

		const { data: result, error } = await supabase.rpc(
			"retry_all_instagram_imports",
			{ p_user_id: user.id },
		);

		if (error) {
			console.error(`[${route}] Retry all error:`, error);
			return apiError({
				route,
				message: "Failed to retry all imports",
				error,
				operation: "retry_all_imports",
				userId: user.id,
			});
		}

		return result;
	},
});
