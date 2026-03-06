// Called by: Cypress e2e tests only (non-cascade delete for test cleanup)
import {
	BookmarksDeleteNonCascadeInputSchema,
	BookmarksDeleteNonCascadeOutputSchema,
} from "./schema";
import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-bookmarks-delete-non-cascade";

export const DELETE = createDeleteApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: BookmarksDeleteNonCascadeInputSchema,
	outputSchema: BookmarksDeleteNonCascadeOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;
		const bookmarkId = data.data.id;

		console.log(`[${route}] API called:`, { userId, bookmarkId });

		const { error } = await supabase
			.from(MAIN_TABLE_NAME)
			.delete()
			.eq("user_id", userId)
			.eq("id", bookmarkId);

		if (error) {
			return apiError({
				route,
				message: "Failed to delete bookmark",
				error,
				operation: "delete_bookmarks_non_cascade",
				userId,
				extra: { bookmarkId },
			});
		}

		return null;
	},
});
