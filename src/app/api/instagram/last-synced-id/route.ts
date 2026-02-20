import { z } from "zod";

import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "instagram-last-synced-id";

const InputSchema = z.object({});

const OutputSchema = z.object({
	last_synced_instagram_id: z.string().nullable(),
});

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
	handler: async ({ supabase, user, route }) => {
		const { data, error } = await supabase
			.from(PROFILES)
			.select("last_synced_instagram_id")
			.eq("id", user.id)
			.single();

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch last synced Instagram ID",
				error,
				operation: "fetch_last_synced_instagram_id",
				userId: user.id,
			});
		}

		return { last_synced_instagram_id: data.last_synced_instagram_id };
	},
});
