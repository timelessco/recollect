import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { FetchBookmarksViewInputSchema, FetchBookmarksViewOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-bookmarks-view";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { category_id } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { category_id, userId });

    const { data: viewData, error } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select("category_views")
      .eq("id", category_id)
      .eq("user_id", userId);

    if (error) {
      return apiError({
        error,
        extra: { category_id },
        message: "Failed to fetch bookmarks view",
        operation: "bookmarks_view_fetch",
        route,
        userId,
      });
    }

    return viewData;
  },
  inputSchema: FetchBookmarksViewInputSchema,
  outputSchema: FetchBookmarksViewOutputSchema,
  route: ROUTE,
});
