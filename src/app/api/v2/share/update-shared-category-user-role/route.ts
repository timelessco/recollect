import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

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

      // Entity IDs + input context BEFORE the operation
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.shared_category_id = data.id;
      }
      setPayload(ctx, { new_edit_access: data.updateData.edit_access });

      const updatePayload = {
        ...(data.updateData.edit_access !== undefined && {
          edit_access: data.updateData.edit_access,
        }),
        ...(data.updateData.category_views !== undefined && {
          category_views: toJson(data.updateData.category_views),
        }),
      };

      const { data: updated, error } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .update(updatePayload)
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

      // Outcome flag AFTER the operation
      setPayload(ctx, { role_updated: true });

      return updated;
    },
    inputSchema: UpdateSharedCategoryUserRoleInputSchema,
    outputSchema: UpdateSharedCategoryUserRoleOutputSchema,
    route: ROUTE,
  }),
);
