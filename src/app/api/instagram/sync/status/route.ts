import { z } from "zod";

import { InstagramSyncStatusOutputSchema } from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "instagram-sync-status";

const StatusInputSchema = z.object({});

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: StatusInputSchema,
	outputSchema: InstagramSyncStatusOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const { data, error } = await supabase.rpc("get_instagram_sync_status", {
			p_user_id: user.id,
		});

		if (error) {
			console.error(`[${route}] Status error:`, error);
			return apiError({
				route,
				message: "Failed to get sync status",
				error,
				operation: "get_status",
				userId: user.id,
			});
		}

		return data;
	},
});
