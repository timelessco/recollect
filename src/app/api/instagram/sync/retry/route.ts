import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "instagram-sync-retry";

const RetryInputSchema = z.object({
	msg_ids: z.array(z.number()).min(1).max(100),
});

const RetryOutputSchema = z.object({
	requeued: z.number(),
	requested: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RetryInputSchema,
	outputSchema: RetryOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
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
	},
});
