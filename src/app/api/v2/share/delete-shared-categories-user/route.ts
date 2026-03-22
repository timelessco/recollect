import * as Sentry from "@sentry/nextjs";

import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  DeleteSharedCategoriesUserInputSchema,
  DeleteSharedCategoriesUserOutputSchema,
} from "./schema";

const ROUTE = "v2-share-delete-shared-categories-user";

export const DELETE = createDeleteApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { id: data.id, userId });

    const { data: deleted, error } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .delete()
      .match({ id: data.id, user_id: userId })
      .select();

    if (error) {
      return apiError({
        error,
        extra: { id: data.id },
        message: "Failed to delete shared category",
        operation: "delete_shared_category",
        route,
        userId,
      });
    }

    if (deleted.length === 0) {
      return apiWarn({
        context: { id: data.id, userId },
        message: "Shared category not found",
        route,
        status: 404,
      });
    }

    // Clean up favorite_categories for the departing user (atomic array_remove)
    const categoryId = deleted[0].category_id;
    const { error: favCleanupError } = await supabase.rpc("remove_favorite_category_for_user", {
      p_category_id: categoryId,
    });

    if (favCleanupError) {
      console.error(`[${route}] Failed to clean up favorite_categories:`, {
        categoryId,
        error: favCleanupError,
        userId,
      });
      Sentry.captureException(new Error(favCleanupError.message), {
        extra: {
          categoryId,
          code: favCleanupError.code,
          details: favCleanupError.details,
          hint: favCleanupError.hint,
        },
        tags: { operation: "cleanup_favorite_categories", userId },
      });
    }

    return deleted;
  },
  inputSchema: DeleteSharedCategoriesUserInputSchema,
  outputSchema: DeleteSharedCategoriesUserOutputSchema,
  route: ROUTE,
});
