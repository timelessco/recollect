import { FetchByIdInputSchema, FetchByIdOutputSchema } from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "@/utils/constants";

const ROUTE = "v2-bookmarks-get-fetch-by-id";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchByIdInputSchema,
	outputSchema: FetchByIdOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;
		const bookmarkId = data.id;

		console.log(`[${route}] API called:`, { userId, bookmarkId });

		const { data: bookmarks, error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.eq("user_id", userId)
			.eq("id", bookmarkId);

		if (bookmarkError) {
			return apiError({
				route,
				message: "Failed to fetch bookmark",
				error: bookmarkError,
				operation: "bookmark_fetch_by_id",
				userId,
				extra: { bookmarkId },
			});
		}

		const { data: categoriesData, error: categoriesError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select(
				"bookmark_id, category_id(id, category_name, category_slug, icon, icon_color)",
			)
			.eq("bookmark_id", bookmarkId)
			.eq("user_id", userId);

		if (categoriesError) {
			return apiError({
				route,
				message: "Failed to fetch bookmark categories",
				error: categoriesError,
				operation: "bookmark_fetch_by_id_categories",
				userId,
				extra: { bookmarkId },
			});
		}

		const addedCategories = categoriesData
			.filter((item) => item.category_id !== null)
			.map((item) => ({
				category_name: item.category_id.category_name,
				category_slug: item.category_id.category_slug,
				icon: item.category_id.icon,
				icon_color: item.category_id.icon_color,
				id: item.category_id.id,
			}));

		return bookmarks.map((bookmark) => ({
			...bookmark,
			addedCategories,
		}));
	},
});
