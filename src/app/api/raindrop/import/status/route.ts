import { z } from "zod";

import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "raindrop-import-status";

const StatusInputSchema = z.object({});

const ArchiveSchema = z.object({
	msg_id: z.number(),
	url: z.string(),
	failure_reason: z.string().nullable(),
	archived_at: z.string().nullable(),
});

const StatusOutputSchema = z.object({
	pending: z.number(),
	archived: z.number(),
	archives: z.array(ArchiveSchema),
});

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: StatusInputSchema,
	outputSchema: StatusOutputSchema,
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
