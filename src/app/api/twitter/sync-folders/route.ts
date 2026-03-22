import slugify from "slugify";
import uniqid from "uniqid";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { CATEGORIES_TABLE_NAME, PROFILES } from "@/utils/constants";

import { SyncFoldersInputSchema, SyncFoldersOutputSchema } from "./schema";

const ROUTE = "twitter-sync-folders";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] Creating ${data.categories.length} categories`, {
      userId,
    });

    // Get existing categories (case-insensitive dedup)
    // Names are already trimmed and non-empty via Zod schema
    const categoryNames = data.categories.map((category) => category.name);

    const { data: existingCategories, error: existingError } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select("category_name")
      .eq("user_id", userId);

    if (existingError) {
      return apiError({
        error: existingError,
        message: "Failed to fetch existing categories",
        operation: "fetch_categories",
        route,
        userId,
      });
    }

    const existingNamesLower = new Set(
      (existingCategories ?? []).map((category) => String(category.category_name).toLowerCase()),
    );

    // Dedupe request by case-insensitive name (first occurrence wins)
    const seenLower = new Set<string>();
    const uniqueNames = categoryNames.filter((name) => {
      const key = name.toLowerCase();
      if (seenLower.has(key)) {
        return false;
      }

      seenLower.add(key);
      return true;
    });

    // Filter out categories that already exist
    const newCategoryNames = uniqueNames.filter(
      (name) => !existingNamesLower.has(name.toLowerCase()),
    );

    if (newCategoryNames.length === 0) {
      return { created: 0, skipped: categoryNames.length };
    }

    // Insert new categories with twitter slug pattern
    const rowsToInsert = newCategoryNames.map((categoryName) => ({
      category_name: categoryName,
      category_slug: `${slugify(categoryName, {
        lower: true,
      })}-${uniqid.time()}-twitter`,
      icon: "bookmark",
      icon_color: "#ffffff",
      user_id: userId,
    }));

    const { data: insertedCategories, error: insertError } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      // Race condition: another request inserted the same category between
      // our SELECT and INSERT. Return 409 so the client can retry.
      if (insertError.code === "23505") {
        console.warn(`[${route}] Duplicate category (race condition)`, {
          error: insertError,
          userId,
        });
        return apiWarn({
          message: "Duplicate category name detected",
          route,
          status: 409,
        });
      }

      return apiError({
        error: insertError,
        message: "Failed to create categories",
        operation: "insert_categories",
        route,
        userId,
      });
    }

    // Update category_order in profile
    if (insertedCategories && insertedCategories.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from(PROFILES)
        .select("category_order")
        .eq("id", userId)
        .single();

      if (profileError) {
        return apiError({
          error: profileError,
          message: "Failed to fetch profile",
          operation: "fetch_profile",
          route,
          userId,
        });
      }

      const existingOrder = profileData?.category_order ?? [];
      const newIds = insertedCategories.map((item) => item.id);
      const updatedOrder = [...existingOrder, ...newIds];

      const { error: orderError } = await supabase
        .from(PROFILES)
        .update({ category_order: updatedOrder })
        .eq("id", userId);

      if (orderError) {
        return apiError({
          error: orderError,
          message: "Failed to update category order",
          operation: "update_category_order",
          route,
          userId,
        });
      }
    }

    const created = insertedCategories?.length ?? 0;
    const skipped = categoryNames.length - created;

    console.log(`[${route}] Done:`, { created, skipped, userId });

    return { created, skipped };
  },
  inputSchema: SyncFoldersInputSchema,
  outputSchema: SyncFoldersOutputSchema,
  route: ROUTE,
});
