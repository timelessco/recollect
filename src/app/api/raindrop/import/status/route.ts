import { z } from "zod";

import { RaindropImportStatusOutputSchema } from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "raindrop-import-status";

const StatusInputSchema = z.object({});

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: StatusInputSchema,
	outputSchema: RaindropImportStatusOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const { data, error } = await supabase.rpc("get_raindrop_sync_status", {
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
