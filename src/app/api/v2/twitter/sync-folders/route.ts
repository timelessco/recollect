import slugify from "slugify";
import uniqid from "uniqid";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { CATEGORIES_TABLE_NAME, PROFILES } from "@/utils/constants";

import { V2SyncFoldersInputSchema, V2SyncFoldersOutputSchema } from "./schema";

const ROUTE = "v2-twitter-sync-folders";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const categoryNames = data.categories.map((category) => category.name);

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { requested_count: categoryNames.length });

      // Names are already trimmed and non-empty via Zod schema.
      const { data: existingCategories, error: existingError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("category_name")
        .eq("user_id", userId);

      if (existingError) {
        throw new RecollectApiError("service_unavailable", {
          cause: existingError,
          message: "Failed to fetch existing categories",
          operation: "fetch_categories",
        });
      }

      const existingNamesLower = new Set(
        (existingCategories ?? []).map((category) => String(category.category_name).toLowerCase()),
      );

      // Dedupe request by case-insensitive name (first occurrence wins).
      const seenLower = new Set<string>();
      const uniqueNames = categoryNames.filter((name) => {
        const key = name.toLowerCase();
        if (seenLower.has(key)) {
          return false;
        }

        seenLower.add(key);
        return true;
      });

      // Filter out categories that already exist.
      const newCategoryNames = uniqueNames.filter(
        (name) => !existingNamesLower.has(name.toLowerCase()),
      );

      if (newCategoryNames.length === 0) {
        setPayload(ctx, {
          created_count: 0,
          skipped_count: categoryNames.length,
          sync_completed: true,
        });
        return { created: 0, skipped: categoryNames.length };
      }

      // Insert new categories with twitter slug pattern.
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
          throw new RecollectApiError("conflict", {
            cause: insertError,
            message: "Duplicate category name detected",
            operation: "insert_categories",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Failed to create categories",
          operation: "insert_categories",
        });
      }

      // Update category_order in profile.
      if (insertedCategories && insertedCategories.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from(PROFILES)
          .select("category_order")
          .eq("id", userId)
          .single();

        if (profileError) {
          throw new RecollectApiError("service_unavailable", {
            cause: profileError,
            message: "Failed to fetch profile",
            operation: "fetch_profile",
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
          throw new RecollectApiError("service_unavailable", {
            cause: orderError,
            message: "Failed to update category order",
            operation: "update_category_order",
          });
        }
      }

      const created = insertedCategories?.length ?? 0;
      const skipped = categoryNames.length - created;

      setPayload(ctx, {
        created_count: created,
        skipped_count: skipped,
        sync_completed: true,
      });

      return { created, skipped };
    },
    inputSchema: V2SyncFoldersInputSchema,
    outputSchema: V2SyncFoldersOutputSchema,
    route: ROUTE,
  }),
);
