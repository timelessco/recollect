import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "twitter-last-synced-id";

const InputSchema = z.object({
	last_synced_twitter_id: z.string(),
});

const OutputSchema = z.object({
	last_synced_twitter_id: z.string(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { data: profile, error } = await supabase
			.from(PROFILES)
			.update({ last_synced_twitter_id: data.last_synced_twitter_id })
			.match({ id: user.id })
			.select("last_synced_twitter_id")
			.single();

		if (error) {
			return apiError({
				route,
				message: "Failed to update last synced Twitter ID",
				error,
				operation: "update_last_synced_twitter_id",
				userId: user.id,
			});
		}

		return { last_synced_twitter_id: profile.last_synced_twitter_id };
	},
});
