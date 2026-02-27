import {
	UpdateCategoryOrderInputSchema,
	UpdateCategoryOrderOutputSchema,
} from "./schema";
import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-category-update-category-order";

export const PATCH = createPatchApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: UpdateCategoryOrderInputSchema,
	outputSchema: UpdateCategoryOrderOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;
		const categoryOrder = data.category_order ?? [];

		console.log(`[${route}] API called:`, { userId });

		const { data: updateData, error: updateError } = await supabase
			.from(PROFILES)
			.update({ category_order: categoryOrder })
			.match({ id: userId })
			.select("id, category_order");

		if (updateError) {
			return apiError({
				route,
				message: "Failed to update category order",
				error: updateError,
				operation: "update_category_order",
				userId,
			});
		}

		return updateData;
	},
});
