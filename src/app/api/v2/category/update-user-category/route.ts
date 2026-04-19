import { after } from "next/server";

import type { Database } from "@/types/database.types";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { revalidatePublicCategoryPage } from "@/lib/revalidation-helpers";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { CATEGORIES_TABLE_NAME, DUPLICATE_CATEGORY_NAME_ERROR, PROFILES } from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import { UpdateUserCategoryInputSchema, UpdateUserCategoryOutputSchema } from "./schema";

type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

const ROUTE = "v2-category-update-user-category";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { category_id: categoryId, updateData } = data;
      const userId = user.id;

      // Separate `is_favorite` (legacy compat) from actual category fields.
      // oxlint-disable-next-line @typescript-eslint/no-deprecated -- backward compat for old mobile builds
      const { is_favorite, ...categoryUpdateData } = updateData;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_id = categoryId;
      }

      // Run category-table update first (if there are fields to update). If the
      // payload is effectively empty, fall back to a SELECT so the caller still
      // gets the current row back (existing v1 contract — avoids a no-op write).
      const hasOtherUpdates = Object.keys(categoryUpdateData).length > 0;
      const updatePayload = toDbType<CategoryUpdate>(categoryUpdateData);

      const { data: categoryData, error: dbError } = hasOtherUpdates
        ? await supabase
            .from(CATEGORIES_TABLE_NAME)
            .update(updatePayload)
            .match({ id: categoryId, user_id: userId })
            .select()
        : await supabase
            .from(CATEGORIES_TABLE_NAME)
            .select()
            .match({ id: categoryId, user_id: userId });

      if (dbError) {
        // Postgres 23505 = unique_violation. Case-insensitive duplicate name is
        // enforced by the `unique_user_category_name_ci` index.
        if (dbError.code === "23505" || dbError.message?.includes("unique_user_category_name_ci")) {
          throw new RecollectApiError("conflict", {
            cause: dbError,
            message: DUPLICATE_CATEGORY_NAME_ERROR,
            operation: "category_update",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Error updating category",
          operation: "update_category",
        });
      }

      if (!isNonEmptyArray(categoryData)) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("Empty update result"),
          message: "No data returned from database",
          operation: "update_category_empty",
        });
      }

      // @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
      // Handle legacy `is_favorite` → `profiles.favorite_categories` update.
      // Runs after category update succeeds so we don't mutate favorites on a failed request.
      if (is_favorite !== undefined) {
        const numericCategoryId =
          typeof categoryId === "string" ? Number.parseInt(categoryId, 10) : categoryId;

        if (is_favorite) {
          // Add to favorites (idempotent: remove first, then toggle to add).
          const { error: removeError } = await supabase.rpc("remove_favorite_category_for_user", {
            p_category_id: numericCategoryId,
          });

          if (removeError) {
            throw new RecollectApiError("service_unavailable", {
              cause: removeError,
              message: "Error updating favorite status",
              operation: "remove_favorite_category",
            });
          }

          const { error: toggleError } = await supabase.rpc("toggle_favorite_category", {
            p_category_id: numericCategoryId,
          });

          if (toggleError) {
            throw new RecollectApiError("service_unavailable", {
              cause: toggleError,
              message: "Error updating favorite status",
              operation: "toggle_favorite_category",
            });
          }
        } else {
          // Remove from favorites (idempotent: no-op if absent).
          const { error: removeError } = await supabase.rpc("remove_favorite_category_for_user", {
            p_category_id: numericCategoryId,
          });

          if (removeError) {
            throw new RecollectApiError("service_unavailable", {
              cause: removeError,
              message: "Error updating favorite status",
              operation: "remove_favorite_category",
            });
          }
        }

        if (ctx?.fields) {
          ctx.fields.favorite_toggled = is_favorite;
        }
      }

      if (ctx?.fields) {
        ctx.fields.category_updated = true;
        ctx.fields.category_is_public = categoryData[0].is_public;
      }

      // Trigger on-demand revalidation for public categories. Covers:
      // - Visibility changes (public ↔ private)
      // - View settings (columns, sort order, card content)
      // - Category name, icon, or color changes
      // Runs after the response is sent — revalidation failures never fail the mutation.
      const shouldRevalidate = categoryData[0].is_public || updateData.is_public !== undefined;

      if (shouldRevalidate) {
        const categorySlug = categoryData[0].category_slug;
        const categoryRowId = categoryData[0].id;

        after(async () => {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from(PROFILES)
              .select("user_name")
              .eq("id", userId)
              .single();

            if (profileError) {
              logger.warn(
                "[v2-category-update-user-category] profile fetch for revalidation failed",
                {
                  category_id: categoryRowId,
                  error: profileError.message,
                  user_id: userId,
                },
              );
              return;
            }

            const userName = profileData?.user_name;
            if (!userName) {
              return;
            }

            await revalidatePublicCategoryPage(userName, categorySlug, {
              categoryId: categoryRowId,
              operation: "update_category",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-category-update-user-category] after() revalidation failed", {
              category_id: categoryRowId,
              error: error instanceof Error ? error.message : String(error),
              user_id: userId,
            });
          }
        });

        if (ctx?.fields) {
          ctx.fields.revalidation_scheduled = true;
        }
      }

      return categoryData;
    },
    inputSchema: UpdateUserCategoryInputSchema,
    outputSchema: UpdateUserCategoryOutputSchema,
    route: ROUTE,
  }),
);
