import { FetchUserTagsInputSchema, FetchUserTagsOutputSchema } from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { TAG_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-tags-fetch-user-tags";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchUserTagsInputSchema,
	outputSchema: FetchUserTagsOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const { data, error } = await supabase
			.from(TAG_TABLE_NAME)
			.select("*")
			.eq("user_id", userId);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch user tags",
				error,
				operation: "tags_fetch",
				userId,
			});
		}

		return data;
	},
});
