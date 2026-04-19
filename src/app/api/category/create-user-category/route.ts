import slugify from "slugify";
import uniqid from "uniqid";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray, isNonNullable } from "@/utils/assertion-utils";
import { CATEGORIES_TABLE_NAME, DUPLICATE_CATEGORY_NAME_ERROR, PROFILES } from "@/utils/constants";

import { CreateCategoryPayloadSchema, CreateCategoryResponseSchema } from "./schema";

const ROUTE = "create-user-category";

/**
 * @deprecated Use /api/v2/category/create-user-category instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { category_order: categoryOrder, icon, icon_color, name } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { name, userId });

    const { data: categoryData, error } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .insert([
        {
          category_name: name,
          category_slug: `${slugify(name, { lower: true })}-${uniqid.time()}`,
          user_id: userId,
          ...(icon !== undefined && { icon }),
          ...(icon_color !== undefined && { icon_color }),
        },
      ])
      .select();

    if (error) {
      // Handle unique constraint violation (case-insensitive duplicate)
      // Postgres error code 23505 = unique_violation
      if (error.code === "23505" || error.message?.includes("unique_user_category_name_ci")) {
        return apiWarn({
          context: { name, userId },
          message: DUPLICATE_CATEGORY_NAME_ERROR,
          route,
          status: 409,
        });
      }

      return apiError({
        error,
        extra: { name },
        message: "Error creating category",
        operation: "insert_category",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(categoryData)) {
      return apiError({
        error: new Error("Empty insert result"),
        message: "No data returned from database",
        operation: "insert_category_empty",
        route,
        userId,
      });
    }

    // Update category order if provided
    if (isNonNullable(categoryOrder)) {
      const newCategoryId = categoryData[0].id;

      console.log(`[${route}] Updating category order:`, { newCategoryId });

      const { error: orderError } = await supabase
        .from(PROFILES)
        .update({ category_order: [...categoryOrder, newCategoryId] })
        .match({ id: userId })
        .select("id, category_order");

      if (orderError) {
        return apiError({
          error: orderError,
          extra: { categoryId: newCategoryId },
          message: "Error updating category order",
          operation: "update_category_order",
          route,
          userId,
        });
      }
    }

    console.log(`[${route}] Category created:`, {
      categoryId: categoryData[0].id,
    });

    return categoryData;
  },
  inputSchema: CreateCategoryPayloadSchema,
  outputSchema: CreateCategoryResponseSchema,
  route: ROUTE,
});
