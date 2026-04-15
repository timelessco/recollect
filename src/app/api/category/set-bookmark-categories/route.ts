import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

import { SetBookmarkCategoriesPayloadSchema, SetBookmarkCategoriesResponseSchema } from "./schema";

const ROUTE = "set-bookmark-categories";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmark_id: bookmarkId, category_ids: categoryIds } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, {
      bookmarkId,
      categoryIds,
      userId,
    });

    // Filter non-zero categories for ownership verification
    const nonZeroCategoryIds = categoryIds.filter((id) => id !== UNCATEGORIZED_CATEGORY_ID);

    // 1. Verify bookmark ownership + owned categories in parallel
    const [bookmarkResult, ownedCategoriesResult] = await Promise.all([
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id")
        .eq("id", bookmarkId)
        .eq("user_id", userId)
        .single(),
      nonZeroCategoryIds.length > 0
        ? supabase
            .from(CATEGORIES_TABLE_NAME)
            .select("id")
            .eq("user_id", userId)
            .in("id", nonZeroCategoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Handle bookmark check result
    if (bookmarkResult.error) {
      if (bookmarkResult.error.code === "PGRST116") {
        return apiWarn({
          context: { bookmarkId },
          message: "Bookmark not found or not owned by user",
          route,
          status: 404,
        });
      }

      return apiError({
        error: bookmarkResult.error,
        extra: { bookmarkId },
        message: "Failed to verify bookmark ownership",
        operation: "fetch_bookmark",
        route,
        userId,
      });
    }

    // 2. Verify access to all non-zero categories
    if (nonZeroCategoryIds.length > 0) {
      if (ownedCategoriesResult.error) {
        return apiError({
          error: ownedCategoriesResult.error,
          extra: { categoryIds: nonZeroCategoryIds },
          message: "Failed to fetch categories",
          operation: "fetch_owned_categories",
          route,
          userId,
        });
      }

      const ownedCategoryIds = new Set(ownedCategoriesResult.data?.map((cat) => cat.id));
      const notOwnedCategoryIds = nonZeroCategoryIds.filter((id) => !ownedCategoryIds.has(id));

      // For categories not owned, check shared access
      const { email } = user;
      if (notOwnedCategoryIds.length > 0 && email) {
        const { data: sharedCategories, error: sharedCategoriesError } = await supabase
          .from(SHARED_CATEGORIES_TABLE_NAME)
          .select("category_id, edit_access")
          .eq("email", email)
          .in("category_id", notOwnedCategoryIds);

        if (sharedCategoriesError) {
          return apiError({
            error: sharedCategoriesError,
            extra: { categoryIds: notOwnedCategoryIds, email },
            message: "Failed to fetch shared categories",
            operation: "fetch_shared_categories",
            route,
            userId,
          });
        }

        const sharedWithEditAccess = new Set(
          sharedCategories
            ?.filter((shared) => shared.edit_access)
            .map((shared) => shared.category_id),
        );

        const unauthorizedCategoryIds = notOwnedCategoryIds.filter(
          (id) => !sharedWithEditAccess.has(id),
        );

        if (unauthorizedCategoryIds.length > 0) {
          return apiWarn({
            context: { unauthorizedCategoryIds, userId },
            message: `No access to categories: ${unauthorizedCategoryIds.join(", ")}`,
            route,
            status: 403,
          });
        }
      } else if (notOwnedCategoryIds.length > 0) {
        return apiWarn({
          context: { notOwnedCategoryIds, userId },
          message: `No access to categories: ${notOwnedCategoryIds.join(", ")}`,
          route,
          status: 403,
        });
      }
    }

    console.log(`[${route}] Category access verified`);

    // 3. Get old categories before replacement (for revalidation)
    const { data: oldCategories } = await supabase
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .select("category_id")
      .eq("bookmark_id", bookmarkId);

    const oldCategoryIds = oldCategories?.map((cat) => cat.category_id) ?? [];

    // 4. Atomically replace bookmark categories via RPC
    const { data: insertedData, error: rpcError } = await supabase.rpc("set_bookmark_categories", {
      p_bookmark_id: bookmarkId,
      p_category_ids: categoryIds,
    });

    if (rpcError) {
      return apiError({
        error: rpcError,
        extra: { bookmarkId, categoryIds },
        message: "Failed to set bookmark categories",
        operation: "set_bookmark_categories_rpc",
        route,
        userId,
      });
    }

    console.log(`[${route}] Categories set successfully:`, {
      bookmarkId,
      categoryIds,
      insertedCount: insertedData.length,
    });

    // 5. Trigger revalidation for all affected categories (old + new, deduplicated)
    // Don't await - failed revalidation shouldn't fail the mutation
    const allAffectedCategoryIds = [...new Set([...categoryIds, ...oldCategoryIds])].filter(
      (id) => id !== UNCATEGORIZED_CATEGORY_ID,
    );

    if (allAffectedCategoryIds.length > 0) {
      void (async () => {
        try {
          await revalidateCategoriesIfPublic(allAffectedCategoryIds, {
            operation: "set_bookmark_categories",
            userId,
          });
        } catch (revalidationError) {
          console.error(`[${route}] Revalidation failed:`, {
            categoryIds: allAffectedCategoryIds,
            error: revalidationError,
            userId,
          });
        }
      })();
    }

    return insertedData;
  },
  inputSchema: SetBookmarkCategoriesPayloadSchema,
  outputSchema: SetBookmarkCategoriesResponseSchema,
  route: ROUTE,
});
