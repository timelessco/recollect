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

    // Clean up favorite_categories for the departing user (atomic array_remove)
    const categoryId = deleted[0].category_id;
    const { error: favCleanupError } = await supabase.rpc("remove_favorite_category_for_user", {
      p_category_id: categoryId,
    });

    if (favCleanupError) {
      console.error(`[${route}] Failed to clean up favorite_categories:`, {
        error: favCleanupError,
        categoryId,
        userId,
      });
      Sentry.captureException(new Error(favCleanupError.message), {
        tags: { operation: "cleanup_favorite_categories", userId },
        extra: {
          categoryId,
          code: favCleanupError.code,
          details: favCleanupError.details,
          hint: favCleanupError.hint,
        },
      });
    }

    return deleted;
  },
});
