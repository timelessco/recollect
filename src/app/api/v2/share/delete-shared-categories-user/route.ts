import {
	DeleteSharedCategoriesUserInputSchema,
	DeleteSharedCategoriesUserOutputSchema,
} from "./schema";
import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES, SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-share-delete-shared-categories-user";

export const DELETE = createDeleteApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: DeleteSharedCategoriesUserInputSchema,
	outputSchema: DeleteSharedCategoriesUserOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, id: data.id });

		const { data: deleted, error } = await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.delete()
			.match({ id: data.id, user_id: userId })
			.select();

		if (error) {
			return apiError({
				route,
				message: "Failed to delete shared category",
				error,
				operation: "delete_shared_category",
				userId,
				extra: { id: data.id },
			});
		}

		if (deleted.length === 0) {
			return apiWarn({
				route,
				message: "Shared category not found",
				status: 404,
				context: { id: data.id, userId },
			});
		}

		// Clean up favorite_categories for the departing user
		const categoryId = deleted[0].category_id;
		const { data: profileData } = await supabase
			.from(PROFILES)
			.select("favorite_categories")
			.match({ id: userId })
			.single();

		if (profileData?.favorite_categories?.includes(categoryId)) {
			const { error: favCleanupError } = await supabase
				.from(PROFILES)
				.update({
					favorite_categories: profileData.favorite_categories.filter(
						(id: number) => id !== categoryId,
					),
				})
				.match({ id: userId });

			if (favCleanupError) {
				console.warn(
					`[${route}] Failed to clean up favorite_categories:`,
					favCleanupError,
				);
			}
		}

		return deleted;
	},
});
