import {
	RaindropImportRetryInputSchema as RetryInputSchema,
	RaindropImportRetryOutputSchema as RetryOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "raindrop-import-retry";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RetryInputSchema,
	outputSchema: RetryOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		console.log(`[${route}] API called:`, { userId: user.id, data });

		if ("msg_ids" in data) {
			console.log(`[${route}] Taking per-message path:`, {
				msgIds: data.msg_ids,
			});
			const { data: result, error } = await supabase.rpc(
				"retry_raindrop_import",
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

		console.log(`[${route}] Taking retry-all path`);
		const { data: result, error } = await supabase.rpc(
			"retry_all_raindrop_imports",
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
