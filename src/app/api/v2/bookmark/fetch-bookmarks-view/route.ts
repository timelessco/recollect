import {
	FetchBookmarksViewInputSchema,
	FetchBookmarksViewOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { CATEGORIES_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-bookmark-fetch-bookmarks-view";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchBookmarksViewInputSchema,
	outputSchema: FetchBookmarksViewOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, category_id });

		const { data: viewData, error } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("category_views")
			.eq("id", category_id)
			.eq("user_id", userId);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch bookmarks view",
				error,
				operation: "bookmarks_view_fetch",
				userId,
				extra: { category_id },
			});
		}

		return viewData;
	},
});
