import {
	UpdateSharedCategoryUserRoleInputSchema,
	UpdateSharedCategoryUserRoleOutputSchema,
} from "./schema";
import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

const ROUTE = "v2-share-update-shared-category-user-role";

export const PATCH = createPatchApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: UpdateSharedCategoryUserRoleInputSchema,
	outputSchema: UpdateSharedCategoryUserRoleOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;
		const email = user.email ?? "";

		console.log(`[${route}] API called:`, { userId, id: data.id });

		const { data: updated, error } = await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.update(data.updateData)
			.eq("id", data.id)
			.or(`user_id.eq.${userId},email.eq.${email}`)
			.select();

		if (error) {
			return apiError({
				route,
				message: "Failed to update shared category user role",
				error,
				operation: "update_shared_category_user_role",
				userId,
				extra: { id: data.id },
			});
		}

		return updated;
	},
});
