import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

// Called by: Cypress e2e tests only (non-cascade delete for test cleanup)
import {
  BookmarksDeleteNonCascadeInputSchema,
  BookmarksDeleteNonCascadeOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmarks-delete-non-cascade";

export const DELETE = createDeleteApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;
    const bookmarkId = data.data.id;

    console.log(`[${route}] API called:`, { bookmarkId, userId });

    const { error } = await supabase
      .from(MAIN_TABLE_NAME)
      .delete()
      .eq("user_id", userId)
      .eq("id", bookmarkId);

    if (error) {
      return apiError({
        error,
        extra: { bookmarkId },
        message: "Failed to delete bookmark",
        operation: "delete_bookmarks_non_cascade",
        route,
        userId,
      });
    }

    return null;
  },
  inputSchema: BookmarksDeleteNonCascadeInputSchema,
  outputSchema: BookmarksDeleteNonCascadeOutputSchema,
  route: ROUTE,
});
