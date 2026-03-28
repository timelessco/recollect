import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  UpdateSharedCategoryUserRoleInputSchema,
  UpdateSharedCategoryUserRoleOutputSchema,
} from "./schema";

const ROUTE = "v2-share-update-shared-category-user-role";

export const PATCH = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const email = user.email ?? "";

      const { data: updated, error } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .update(data.updateData)
        .eq("id", data.id)
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .select();

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to update shared category user role",
          operation: "update_shared_category_user_role",
        });
      }

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.shared_category_id = data.id;
      }

      return updated;
    },
    inputSchema: UpdateSharedCategoryUserRoleInputSchema,
    outputSchema: UpdateSharedCategoryUserRoleOutputSchema,
    route: ROUTE,
  }),
);
