import type { Database } from "@/types/database.types";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidatePublicCategoryPage } from "@/lib/revalidation-helpers";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { CATEGORIES_TABLE_NAME, DUPLICATE_CATEGORY_NAME_ERROR, PROFILES } from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import { UpdateCategoryPayloadSchema, UpdateCategoryResponseSchema } from "./schema";

type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

const ROUTE = "update-user-category";

/**
 * @deprecated Use /api/v2/category/update-user-category instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { category_id: categoryId, updateData } = data;
    const userId = user.id;

    // Separate is_favorite (legacy compat) from actual category fields
    // oxlint-disable-next-line @typescript-eslint/no-deprecated -- backward compat for old mobile builds
    const { is_favorite, ...categoryUpdateData } = updateData;

    console.log(`[${route}] API called:`, {
      categoryId,
      categoryName: categoryUpdateData.category_name,
      userId,
    });

    // Run category table update first (if there are fields to update)
    const hasOtherUpdates = Object.keys(categoryUpdateData).length > 0;

    const updatePayload = toDbType<CategoryUpdate>(categoryUpdateData);

    const { data: categoryData, error } = hasOtherUpdates
      ? await supabase
          .from(CATEGORIES_TABLE_NAME)
          .update(updatePayload)
          .match({ id: categoryId, user_id: userId })
          .select()
      : await supabase
          .from(CATEGORIES_TABLE_NAME)
          .select()
          .match({ id: categoryId, user_id: userId });

    if (error) {
      // Handle unique constraint violation (case-insensitive duplicate)
      // Postgres error code 23505 = unique_violation
      if (error.code === "23505" || error.message?.includes("unique_user_category_name_ci")) {
        return apiWarn({
          context: { name: updateData.category_name, userId },
          message: DUPLICATE_CATEGORY_NAME_ERROR,
          route,
          status: 409,
        });
      }

      return apiError({
        error,
        extra: { categoryId },
        message: "Error updating category",
        operation: "update_category",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(categoryData)) {
      return apiError({
        error: new Error("Empty update result"),
        message: "No data returned from database",
        operation: "update_category_empty",
        route,
        userId,
      });
    }

    // @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
    // Handle legacy is_favorite → profiles.favorite_categories update
    // Runs after category update succeeds to avoid mutating favorites on a failed request
    if (is_favorite !== undefined) {
      const numericCategoryId =
        typeof categoryId === "string" ? Number.parseInt(categoryId, 10) : categoryId;

      if (is_favorite) {
        // Add to favorites (idempotent: remove first, then toggle to add)
        const { error: removeError } = await supabase.rpc("remove_favorite_category_for_user", {
          p_category_id: numericCategoryId,
        });

        if (removeError) {
          return apiError({
            error: removeError,
            extra: { categoryId },
            message: "Error updating favorite status",
            operation: "remove_favorite_category",
            route,
            userId,
          });
        }

        const { error: toggleError } = await supabase.rpc("toggle_favorite_category", {
          p_category_id: numericCategoryId,
        });

        if (toggleError) {
          return apiError({
            error: toggleError,
            extra: { categoryId },
            message: "Error updating favorite status",
            operation: "toggle_favorite_category",
            route,
            userId,
          });
        }
      } else {
        // Remove from favorites (idempotent: no-op if absent)
        const { error: removeError } = await supabase.rpc("remove_favorite_category_for_user", {
          p_category_id: numericCategoryId,
        });

        if (removeError) {
          return apiError({
            error: removeError,
            extra: { categoryId },
            message: "Error updating favorite status",
            operation: "remove_favorite_category",
            route,
            userId,
          });
        }
      }
    }

    console.log(`[${route}] Category updated:`, {
      categoryId: categoryData[0].id,
      categoryName: categoryData[0].category_name,
    });

    // Trigger on-demand revalidation for public categories (non-blocking)
    // This ensures public pages reflect all changes immediately:
    // - Visibility changes (public↔private)
    // - View settings (columns, sort order, card content)
    // - Category name, icon, or color changes
    // Don't await - failed revalidation shouldn't fail the mutation
    if (categoryData[0].is_public || updateData.is_public !== undefined) {
      // Fetch user profile to get username for revalidation path
      const { data: profileData, error: profileError } = await supabase
        .from(PROFILES)
        .select("user_name")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(`[${route}] Failed to load profile for revalidation:`, {
          categoryId: categoryData[0].id,
          error: profileError,
          userId,
        });
      } else if (profileData?.user_name) {
        // Fire-and-forget revalidation - errors handled internally by helper
        void revalidatePublicCategoryPage(profileData.user_name, categoryData[0].category_slug, {
          categoryId: categoryData[0].id,
          operation: "update_category",
          userId,
        });
      }
    }

    return categoryData;
  },
  inputSchema: UpdateCategoryPayloadSchema,
  outputSchema: UpdateCategoryResponseSchema,
  route: ROUTE,
});
