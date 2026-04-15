import * as Sentry from "@sentry/nextjs";

import type { AddCategoryToBookmarksResponse } from "./schema";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import {
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

import {
  AddCategoryToBookmarksPayloadSchema,
  AddCategoryToBookmarksResponseSchema,
} from "./schema";

const ROUTE = "add-category-to-bookmarks";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmark_ids: bookmarkIds, category_id: categoryId } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, {
      bookmarkIds,
      categoryId,
      count: bookmarkIds.length,
      userId,
    });

    // 1. Verify ALL bookmarks are owned by user (batch check)
    const { data: ownedBookmarks, error: bookmarkError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select("id")
      .in("id", bookmarkIds)
      .eq("user_id", userId);

    if (bookmarkError) {
      return apiError({
        error: bookmarkError,
        extra: { bookmarkIds },
        message: "Failed to verify bookmark ownership",
        operation: "fetch_bookmarks",
        route,
        userId,
      });
    }

    const ownedIds = new Set(ownedBookmarks?.map((b) => b.id));
    const notOwnedIds = bookmarkIds.filter((id) => !ownedIds.has(id));

    if (notOwnedIds.length > 0) {
      return apiWarn({
        context: { notOwnedIds },
        message: `${notOwnedIds.length} bookmark(s) not found or not owned by user`,
        route,
        status: 403,
      });
    }

    console.log(`[${route}] All ${bookmarkIds.length} bookmarks verified`);

    // 2. Verify category access (skip for uncategorized = 0)
    if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      const { data: categoryData, error: categoryError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("user_id")
        .eq("id", categoryId)
        .single();

      if (categoryError) {
        if (categoryError.code === "PGRST116") {
          return apiWarn({
            context: { categoryId },
            message: "Category not found",
            route,
            status: 404,
          });
        }

        return apiError({
          error: categoryError,
          extra: { categoryId },
          message: "Failed to fetch category",
          operation: "fetch_category",
          route,
          userId,
        });
      }

      // Check if user owns the category
      if (categoryData.user_id !== userId) {
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
            message: "Failed to check shared access",
            operation: "fetch_shared",
            route,
            userId,
          });
        }

        if (!sharedData?.edit_access) {
          return apiWarn({
            context: { categoryId, userId },
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

    // 3. Call RPC for atomic bulk insert
    // RPC returns out_bookmark_id/out_category_id (prefixed to avoid SQL ambiguity)
    const { data: insertedData, error: insertError } = await supabase.rpc(
      "add_category_to_bookmarks",
      {
        p_bookmark_ids: bookmarkIds,
        p_category_id: categoryId,
      },
    );

    if (insertError) {
      return apiError({
        error: insertError,
        extra: { bookmarkIds, categoryId },
        message: "Failed to add category to bookmarks",
        operation: "rpc_add_category_to_bookmarks",
        route,
        userId,
      });
    }

    // Transform RPC response to match API schema
    const transformedData: AddCategoryToBookmarksResponse = (insertedData ?? []).map((row) => ({
      bookmark_id: row.out_bookmark_id,
      category_id: row.out_category_id,
    }));

    console.log(
      `[${route}] Category added to ${transformedData.length} bookmarks (${bookmarkIds.length - transformedData.length} already had it)`,
    );

    // Trigger revalidation if category is public (non-blocking)
    // Don't await - failed revalidation shouldn't fail the mutation
    if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
      console.log(`[${route}] Initiating revalidation:`, {
        categoryId,
        userId,
      });

      void (async () => {
        try {
          await revalidateCategoryIfPublic(categoryId, {
            operation: "add_category_to_bookmarks",
            userId,
          });
        } catch (revalidationError) {
          console.error(`[${route}] Revalidation failed:`, {
            categoryId,
            error: revalidationError,
            errorMessage:
              revalidationError instanceof Error
                ? revalidationError.message
                : "revalidation failed in add-category-to-bookmarks",
            errorStack: revalidationError instanceof Error ? revalidationError.stack : undefined,
            userId,
          });
          Sentry.captureException(revalidationError, {
            extra: { categoryId, operation: "revalidation", userId },
            tags: { route: ROUTE },
          });
        }
      })();
    }

    return transformedData;
  },
  inputSchema: AddCategoryToBookmarksPayloadSchema,
  outputSchema: AddCategoryToBookmarksResponseSchema,
  route: ROUTE,
});
