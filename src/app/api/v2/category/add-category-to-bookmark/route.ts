import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import {
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

import { AddCategoryToBookmarkInputSchema, AddCategoryToBookmarkOutputSchema } from "./schema";

const ROUTE = "v2-category-add-category-to-bookmark";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmark_id: bookmarkId, category_id: categoryId } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
        ctx.fields.category_id = categoryId;
      }

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

      if (bookmarkResult.error) {
        if (bookmarkResult.error.code === "PGRST116") {
          throw new RecollectApiError("not_found", {
            message: "Bookmark not found or not owned by user",
            operation: "fetch_bookmark",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkResult.error,
          message: "Failed to verify bookmark ownership",
          operation: "fetch_bookmark",
        });
      }

      // 2. Verify category access (skip for uncategorized = 0)
      if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
        if (categoryResult.error) {
          if (categoryResult.error.code === "PGRST116") {
            throw new RecollectApiError("not_found", {
              message: "Category not found",
              operation: "fetch_category",
            });
          }

          throw new RecollectApiError("service_unavailable", {
            cause: categoryResult.error,
            message: "Failed to fetch category",
            operation: "fetch_category",
          });
        }

        // If user doesn't own the category, check for collaborator edit access.
        if (categoryResult.data?.user_id !== userId) {
          const { email } = user;
          if (!email) {
            throw new RecollectApiError("forbidden", {
              message: "No access to this category",
              operation: "category_access_check",
            });
          }

          const { data: sharedData, error: sharedError } = await supabase
            .from(SHARED_CATEGORIES_TABLE_NAME)
            .select("edit_access")
            .eq("category_id", categoryId)
            .eq("email", email)
            .single();

          if (sharedError && sharedError.code !== "PGRST116") {
            throw new RecollectApiError("service_unavailable", {
              cause: sharedError,
              message: "Failed to fetch shared category",
              operation: "fetch_shared_category",
            });
          }

          if (!sharedData?.edit_access) {
            throw new RecollectApiError("forbidden", {
              message: "No edit access to this category",
              operation: "category_edit_access_check",
            });
          }

          setPayload(ctx, { access_mode: "collaborator" });
        } else {
          setPayload(ctx, { access_mode: "owner" });
        }
      } else {
        setPayload(ctx, { access_mode: "uncategorized" });
      }

      // 3. Call bulk RPC with single-element array.
      // RPC handles exclusive-model logic (removing category 0 when adding a real
      // category) and returns out_bookmark_id / out_category_id (prefixed to avoid
      // SQL ambiguity).
      const { data: insertedData, error: insertError } = await supabase.rpc(
        "add_category_to_bookmarks",
        {
          p_bookmark_ids: [bookmarkId],
          p_category_id: categoryId,
        },
      );

      if (insertError) {
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Failed to add category to bookmark",
          operation: "rpc_add_category_to_bookmarks",
        });
      }

      const transformedData = insertedData.map((row) => ({
        bookmark_id: row.out_bookmark_id,
        category_id: row.out_category_id,
      }));

      setPayload(ctx, {
        category_added: true,
        result_count: transformedData.length,
      });

      // Trigger public-category revalidation after the response is sent.
      // Failures never fail the mutation.
      if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
        after(async () => {
          try {
            await revalidateCategoryIfPublic(categoryId, {
              operation: "add_category_to_bookmark",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-category-add-category-to-bookmark] after() revalidation failed", {
              category_id: categoryId,
              error: error instanceof Error ? error.message : String(error),
              user_id: userId,
            });
          }
        });

        setPayload(ctx, { revalidation_scheduled: true });
      }

      return transformedData;
    },
    inputSchema: AddCategoryToBookmarkInputSchema,
    outputSchema: AddCategoryToBookmarkOutputSchema,
    route: ROUTE,
  }),
);
