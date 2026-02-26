import {
	FetchSharedCategoriesDataInputSchema,
	FetchSharedCategoriesDataOutputSchema,
} from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-share-fetch-shared-categories-data";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchSharedCategoriesDataInputSchema,
	outputSchema: FetchSharedCategoriesDataOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const { id: userId, email } = user;

		if (!email) {
			return apiWarn({
				route,
				message: "User email not available",
				status: 400,
				context: { userId },
			});
		}

		console.log(`[${route}] API called:`, { userId, email });

		const { data, error } = await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select()
			.or(`email.eq.${email},user_id.eq.${userId}`);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch shared categories",
				error,
				operation: "shared_categories_fetch",
				userId,
				extra: { email },
			});
		}

		return data;
	},
});
