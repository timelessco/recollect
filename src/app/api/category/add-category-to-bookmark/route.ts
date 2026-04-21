import type { AddCategoryToBookmarkResponse } from "./schema";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import {
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

import { AddCategoryToBookmarkPayloadSchema, AddCategoryToBookmarkResponseSchema } from "./schema";

const ROUTE = "add-category-to-bookmark";

/**
 * @deprecated Use /api/v2/category/add-category-to-bookmark instead. Retained for iOS and extension clients.
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

    // 1. Verify bookmark ownership + category ownership in parallel
    const [bookmarkResult, categoryResult] = await Promise.all([
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id")
        .eq("id", bookmarkId)
        .eq("user_id", userId)
        .single(),
      categoryId !== UNCATEGORIZED_CATEGORY_ID
        ? supabase.from(CATEGORIES_TABLE_NAME).select("user_id").eq("id", categoryId).single()
        : Promise.resolve({ data: null, error: null }),
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

    console.log(`[${route}] Bookmark exists and user owns it`);

    // 2. Verify category access (skip for uncategorized = 0)
    if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      if (categoryResult.error) {
        if (categoryResult.error.code === "PGRST116") {
          return apiWarn({
            context: { categoryId },
            message: "Category not found",
            route,
            status: 404,
          });
        }

        return apiError({
          error: categoryResult.error,
          extra: { categoryId },
          message: "Failed to fetch category",
          operation: "fetch_category",
          route,
          userId,
        });
      }

      // Check if user owns the category
      if (categoryResult.data?.user_id !== userId) {
        // Check if user is a collaborator with edit access
        const { email } = user;
        if (!email) {
          return apiWarn({
            context: { categoryId, userId },
            message: "No access to this category",
            route,
            status: 403,
          });
        }

        const { data: sharedData, error: sharedError } = await supabase
          .from(SHARED_CATEGORIES_TABLE_NAME)
          .select("edit_access")
          .eq("category_id", categoryId)
          .eq("email", email)
          .single();

        if (sharedError && sharedError.code !== "PGRST116") {
          return apiError({
            error: sharedError,
            extra: { categoryId, email },
            message: "Failed to fetch shared category",
            operation: "fetch_shared_category",
            route,
            userId,
          });
        }

        if (!sharedData?.edit_access) {
          return apiWarn({
            context: {
              categoryId,
              editAccess: sharedData?.edit_access,
              hasSharedAccess: Boolean(sharedData),
              userId,
            },
            message: "No edit access to this category",
            route,
            status: 403,
          });
        }

        console.log(`[${route}] User has edit access as collaborator`);
      } else {
        console.log(`[${route}] User is category owner`);
      }
    } else {
      console.log(`[${route}] Adding to uncategorized (category_id=${UNCATEGORIZED_CATEGORY_ID})`);
    }

    // 3. Call bulk RPC with single-element array
    // RPC handles exclusive model logic (removing category 0 when adding real categories)
    // RPC returns out_bookmark_id/out_category_id (prefixed to avoid SQL ambiguity)
    const { data: insertedData, error: insertError } = await supabase.rpc(
      "add_category_to_bookmarks",
      {
        p_bookmark_ids: [bookmarkId],
        p_category_id: categoryId,
      },
    );

    if (insertError) {
      return apiError({
        error: insertError,
        extra: { bookmarkId, categoryId },
        message: "Failed to add category to bookmark",
        operation: "rpc_add_category_to_bookmarks",
        route,
        userId,
      });
    }

    const transformedData: AddCategoryToBookmarkResponse = insertedData.map((row) => ({
      bookmark_id: row.out_bookmark_id,
      category_id: row.out_category_id,
    }));

    console.log(`[${route}] Category added successfully:`, {
      bookmarkId,
      categoryId,
      isNewEntry: transformedData.length > 0,
    });

    // Trigger revalidation if category is public
    if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      void (async () => {
        try {
          await revalidateCategoryIfPublic(categoryId, {
            operation: "add_category_to_bookmark",
            userId,
          });
        } catch (revalidationError) {
          console.error(`[${route}] Revalidation failed`, {
            categoryId,
            error: revalidationError,
            userId,
          });
        }
      })();
    }

    return transformedData;
  },
  inputSchema: AddCategoryToBookmarkPayloadSchema,
  outputSchema: AddCategoryToBookmarkResponseSchema,
  route: ROUTE,
});
