import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { UpdateCategoryOrderInputSchema, UpdateCategoryOrderOutputSchema } from "./schema";

const ROUTE = "v2-category-update-category-order";

export const PATCH = createPatchApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
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
        error: updateError,
        message: "Failed to update category order",
        operation: "update_category_order",
        route,
        userId,
      });
    }

    return updateData;
  },
  inputSchema: UpdateCategoryOrderInputSchema,
  outputSchema: UpdateCategoryOrderOutputSchema,
  route: ROUTE,
});
