import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  DeleteSharedCategoriesUserInputSchema,
  DeleteSharedCategoriesUserOutputSchema,
} from "./schema";

const ROUTE = "v2-share-delete-shared-categories-user";

export const DELETE = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.shared_category_id = data.id;
      }

      const { data: deleted, error } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .delete()
        .match({ id: data.id, user_id: userId })
        .select();

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to delete shared category",
          operation: "delete_shared_category",
        });
      }

      if (deleted.length === 0) {
        throw new RecollectApiError("not_found", {
          message: "Shared category not found",
          operation: "delete_shared_category",
        });
      }

      // Clean up favorite_categories for the departing user (atomic array_remove)
      // Best-effort: main delete succeeded, cleanup failure is non-critical
      const categoryId = deleted[0].category_id;
      const { error: favCleanupError } = await supabase.rpc("remove_favorite_category_for_user", {
        p_category_id: categoryId,
      });

      if (favCleanupError) {
        if (ctx?.fields) {
          ctx.fields.fav_cleanup_category_id = categoryId;
        }
        setPayload(ctx, {
          fav_cleanup_failed: true,
          fav_cleanup_error_code: favCleanupError.code,
        });
      }

      return deleted;
    },
    inputSchema: DeleteSharedCategoriesUserInputSchema,
    outputSchema: DeleteSharedCategoriesUserOutputSchema,
    route: ROUTE,
  }),
);
