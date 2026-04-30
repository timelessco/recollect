import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME, UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

import {
  RemoveCategoryFromBookmarkPayloadSchema,
  RemoveCategoryFromBookmarkResponseSchema,
} from "./schema";

const ROUTE = "remove-category-from-bookmark";

/**
 * @deprecated Use /api/v2/category/remove-category-from-bookmark instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmark_id: bookmarkId, category_id: categoryId } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, {
      bookmarkId,
      categoryId,
      userId,
    });

    // Block manual removal of category 0 - it's auto-managed by the exclusive model
    // Users should add a real category to automatically remove category 0
    if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
      return apiWarn({
        context: { bookmarkId, categoryId },
        message: "Cannot manually remove uncategorized. Add a real category to auto-remove it.",
        route,
        status: 400,
      });
    }

    // 1. Verify bookmark ownership (for better error messages than RPC provides)
    const { error: bookmarkError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("id")
      .eq("id", bookmarkId)
      .eq("user_id", userId)
      .single();

    if (bookmarkError) {
      if (bookmarkError.code === "PGRST116") {
        return apiWarn({
          context: { bookmarkId },
          message: "Bookmark not found or not owned by user",
          route,
          status: 404,
        });
      }

      return apiError({
        error: bookmarkError,
        extra: { bookmarkId },
        message: "Failed to fetch bookmark",
        operation: "fetch_bookmark",
        route,
        userId,
      });
    }

    console.log(`[${route}] Bookmark ownership verified`);

    // 2. Call RPC to remove category from bookmark
    // RPC handles: FOR UPDATE locking, deletion, auto-add of category 0 when last real category removed
    const { data: rpcData, error: rpcError } = await supabase.rpc("remove_category_from_bookmark", {
      p_bookmark_id: bookmarkId,
      p_category_id: categoryId,
    });

    if (rpcError) {
      return apiError({
        error: rpcError,
        extra: { bookmarkId, categoryId },
        message: "Failed to remove category from bookmark",
        operation: "rpc_remove_category_from_bookmark",
        route,
        userId,
      });
    }

    // RPC returns empty array if nothing was deleted (category wasn't associated)
    if (!isNonEmptyArray(rpcData)) {
      return apiWarn({
        context: { bookmarkId, categoryId },
        message: "Category association not found",
        route,
        status: 404,
      });
    }

    console.log(`[${route}] Category removed successfully:`, {
      addedUncategorized: rpcData[0].added_uncategorized,
      bookmarkId,
      categoryId,
    });

    // Trigger revalidation if category is public (non-blocking)
    // Don't await - failed revalidation shouldn't fail the mutation
    void (async () => {
      try {
        await revalidateCategoryIfPublic(categoryId, {
          operation: "remove_category_from_bookmark",
          userId,
        });
      } catch (revalidationError) {
        console.error(`[${route}] Revalidation failed:`, {
          categoryId,
          error: revalidationError,
          userId,
        });
      }
    })();

    return [{ bookmark_id: bookmarkId, category_id: categoryId }];
  },
  inputSchema: RemoveCategoryFromBookmarkPayloadSchema,
  outputSchema: RemoveCategoryFromBookmarkResponseSchema,
  route: ROUTE,
});
