import slugify from "slugify";
import uniqid from "uniqid";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { isNonEmptyArray, isNonNullable } from "@/utils/assertion-utils";
import { CATEGORIES_TABLE_NAME, DUPLICATE_CATEGORY_NAME_ERROR, PROFILES } from "@/utils/constants";

import { CreateUserCategoryInputSchema, CreateUserCategoryOutputSchema } from "./schema";

const ROUTE = "v2-category-create-user-category";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { category_order: categoryOrder, icon, icon_color, name } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: categoryData, error: insertError } = await supabase
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

      if (insertError) {
        // Postgres 23505 = unique_violation (case-insensitive duplicate name).
        if (
          insertError.code === "23505" ||
          insertError.message?.includes("unique_user_category_name_ci")
        ) {
          throw new RecollectApiError("conflict", {
            cause: insertError,
            message: DUPLICATE_CATEGORY_NAME_ERROR,
            operation: "insert_category_duplicate",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Error creating category",
          operation: "insert_category",
        });
      }

      if (!isNonEmptyArray(categoryData)) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Empty insert result"),
          message: "No data returned from database",
          operation: "insert_category_empty",
        });
      }

      const newCategoryId = categoryData[0].id;
      if (ctx?.fields) {
        ctx.fields.category_id = newCategoryId;
      }

      // Optionally append the new category ID to the profile's category_order.
      if (isNonNullable(categoryOrder)) {
        const { error: orderError } = await supabase
          .from(PROFILES)
          .update({ category_order: [...categoryOrder, newCategoryId] })
          .match({ id: userId })
          .select("id, category_order");

        if (orderError) {
          throw new RecollectApiError("service_unavailable", {
            cause: orderError,
            message: "Error updating category order",
            operation: "update_category_order",
          });
        }

        if (ctx?.fields) {
          ctx.fields.category_order_updated = true;
        }
      }

      if (ctx?.fields) {
        ctx.fields.category_created = true;
      }

      return categoryData;
    },
    inputSchema: CreateUserCategoryInputSchema,
    outputSchema: CreateUserCategoryOutputSchema,
    route: ROUTE,
  }),
);
