import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { UpdateCategoryOrderInputSchema, UpdateCategoryOrderOutputSchema } from "./schema";

const ROUTE = "v2-category-update-category-order";

export const PATCH = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const categoryOrder = data.category_order ?? [];

      const { data: updateData, error: updateError } = await supabase
        .from(PROFILES)
        .update({ category_order: categoryOrder })
        .match({ id: userId })
        .select("id, category_order");

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to update category order",
          operation: "update_category_order",
        });
      }

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_count = categoryOrder.length;
      }

      return updateData;
    },
    inputSchema: UpdateCategoryOrderInputSchema,
    outputSchema: UpdateCategoryOrderOutputSchema,
    route: ROUTE,
  }),
);
