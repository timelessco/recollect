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

import { AddCategoryToBookmarksInputSchema, AddCategoryToBookmarksOutputSchema } from "./schema";

const ROUTE = "v2-category-add-category-to-bookmarks";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmark_ids: bookmarkIds, category_id: categoryId } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_id = categoryId;
        ctx.fields.bookmark_ids = bookmarkIds;
      }
      setPayload(ctx, { bookmark_count: bookmarkIds.length });

      // 1. Verify ALL bookmarks are owned by user (batch check)
      const { data: ownedBookmarks, error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("id")
        .in("id", bookmarkIds)
        .eq("user_id", userId);

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to verify bookmark ownership",
          operation: "fetch_bookmarks",
        });
      }

      const ownedIds = new Set(ownedBookmarks.map((b) => b.id));
      const notOwnedIds = bookmarkIds.filter((id) => !ownedIds.has(id));

      if (notOwnedIds.length > 0) {
        throw new RecollectApiError("forbidden", {
          context: { not_owned_ids: notOwnedIds },
          message: `${notOwnedIds.length} bookmark(s) not found or not owned by user`,
          operation: "verify_bookmark_ownership",
        });
      }

      // 2. Verify category access (skip for uncategorized = 0)
      if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
        const { data: categoryData, error: categoryError } = await supabase
          .from(CATEGORIES_TABLE_NAME)
          .select("user_id")
          .eq("id", categoryId)
          .single();

        if (categoryError) {
          if (categoryError.code === "PGRST116") {
            throw new RecollectApiError("not_found", {
              message: "Category not found",
              operation: "fetch_category",
            });
          }

          throw new RecollectApiError("service_unavailable", {
            cause: categoryError,
            message: "Failed to fetch category",
            operation: "fetch_category",
          });
        }

        // If user doesn't own the category, check for collaborator edit access.
        if (categoryData.user_id !== userId) {
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
              message: "Failed to check shared access",
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

      // 3. Call RPC for atomic bulk insert.
      // RPC returns out_bookmark_id/out_category_id (prefixed to avoid SQL ambiguity).
      const { data: insertedData, error: insertError } = await supabase.rpc(
        "add_category_to_bookmarks",
        {
          p_bookmark_ids: bookmarkIds,
          p_category_id: categoryId,
        },
      );

      if (insertError) {
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Failed to add category to bookmarks",
          operation: "rpc_add_category_to_bookmarks",
        });
      }

      // Transform RPC response to match API schema.
      const transformedData = insertedData.map((row) => ({
        bookmark_id: row.out_bookmark_id,
        category_id: row.out_category_id,
      }));

      setPayload(ctx, {
        category_added: true,
        result_count: transformedData.length,
        skipped_count: bookmarkIds.length - transformedData.length,
      });

      // Trigger public-category revalidation after the response is sent.
      // Failures never fail the mutation.
      if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
        after(async () => {
          try {
            await revalidateCategoryIfPublic(categoryId, {
              operation: "add_category_to_bookmarks",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-category-add-category-to-bookmarks] after() revalidation failed", {
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
    inputSchema: AddCategoryToBookmarksInputSchema,
    outputSchema: AddCategoryToBookmarksOutputSchema,
    route: ROUTE,
  }),
);
