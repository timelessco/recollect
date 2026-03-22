import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "@/utils/constants";

import { FetchByIdInputSchema, FetchByIdOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-fetch-by-id";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;
    const bookmarkId = data.id;

    console.log(`[${route}] API called:`, { bookmarkId, userId });

    const { data: bookmarks, error: bookmarkError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .eq("id", bookmarkId);

    if (bookmarkError) {
      return apiError({
        error: bookmarkError,
        extra: { bookmarkId },
        message: "Failed to fetch bookmark",
        operation: "bookmark_fetch_by_id",
        route,
        userId,
      });
    }

    const { data: categoriesData, error: categoriesError } = await supabase
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .select("bookmark_id, category_id(id, category_name, category_slug, icon, icon_color)")
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", userId);

    if (categoriesError) {
      return apiError({
        error: categoriesError,
        extra: { bookmarkId },
        message: "Failed to fetch bookmark categories",
        operation: "bookmark_fetch_by_id_categories",
        route,
        userId,
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
  inputSchema: FetchByIdInputSchema,
  outputSchema: FetchByIdOutputSchema,
  route: ROUTE,
});
