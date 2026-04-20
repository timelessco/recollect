import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

import { SetBookmarkCategoriesInputSchema, SetBookmarkCategoriesOutputSchema } from "./schema";

const ROUTE = "v2-category-set-bookmark-categories";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmark_id: bookmarkId, category_ids: categoryIds } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
      }
      setPayload(ctx, { category_ids_count: categoryIds.length });

      // Filter non-zero categories for ownership verification.
      const nonZeroCategoryIds = categoryIds.filter((id) => id !== UNCATEGORIZED_CATEGORY_ID);

      // 1. Verify bookmark ownership + owned categories in parallel.
      const [bookmarkResult, ownedCategoriesResult] = await Promise.all([
        supabase
          .from(MAIN_TABLE_NAME)
          .select("id")
          .eq("id", bookmarkId)
          .eq("user_id", userId)
          .single(),
        nonZeroCategoryIds.length > 0
          ? supabase
              .from(CATEGORIES_TABLE_NAME)
              .select("id")
              .eq("user_id", userId)
              .in("id", nonZeroCategoryIds)
          : Promise.resolve({ data: [], error: null }),
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

      // 2. Verify access to all non-zero categories.
      if (nonZeroCategoryIds.length > 0) {
        if (ownedCategoriesResult.error) {
          throw new RecollectApiError("service_unavailable", {
            cause: ownedCategoriesResult.error,
            message: "Failed to fetch categories",
            operation: "fetch_owned_categories",
          });
        }

        const ownedCategoryIds = new Set(ownedCategoriesResult.data?.map((cat) => cat.id));
        const notOwnedCategoryIds = nonZeroCategoryIds.filter((id) => !ownedCategoryIds.has(id));

        // For categories not owned, check shared access.
        if (notOwnedCategoryIds.length > 0) {
          const { email } = user;
          if (!email) {
            throw new RecollectApiError("forbidden", {
              message: `No access to categories: ${notOwnedCategoryIds.join(", ")}`,
              operation: "category_access_check",
            });
          }

          const { data: sharedCategories, error: sharedCategoriesError } = await supabase
            .from(SHARED_CATEGORIES_TABLE_NAME)
            .select("category_id, edit_access")
            .eq("email", email)
            .in("category_id", notOwnedCategoryIds);

          if (sharedCategoriesError) {
            throw new RecollectApiError("service_unavailable", {
              cause: sharedCategoriesError,
              message: "Failed to fetch shared categories",
              operation: "fetch_shared_categories",
            });
          }

          const sharedWithEditAccess = new Set(
            sharedCategories
              ?.filter((shared) => shared.edit_access)
              .map((shared) => shared.category_id),
          );

          const unauthorizedCategoryIds = notOwnedCategoryIds.filter(
            (id) => !sharedWithEditAccess.has(id),
          );

          if (unauthorizedCategoryIds.length > 0) {
            throw new RecollectApiError("forbidden", {
              message: `No access to categories: ${unauthorizedCategoryIds.join(", ")}`,
              operation: "category_edit_access_check",
            });
          }

          setPayload(ctx, { access_mode: "mixed" });
        } else {
          setPayload(ctx, { access_mode: "owner" });
        }
      } else {
        setPayload(ctx, { access_mode: "uncategorized" });
      }

      // 3. Get old categories before replacement (for revalidation).
      const { data: oldCategories } = await supabase
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("category_id")
        .eq("bookmark_id", bookmarkId);

      const oldCategoryIds = oldCategories?.map((cat) => cat.category_id) ?? [];

      // 4. Atomically replace bookmark categories via RPC.
      const { data: insertedData, error: rpcError } = await supabase.rpc(
        "set_bookmark_categories",
        {
          p_bookmark_id: bookmarkId,
          p_category_ids: categoryIds,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to set bookmark categories",
          operation: "rpc_set_bookmark_categories",
        });
      }

      const transformedData = insertedData.map((row) => ({
        bookmark_id: row.bookmark_id,
        category_id: row.category_id,
      }));

      setPayload(ctx, {
        categories_set: true,
        result_count: transformedData.length,
      });

      // 5. Trigger revalidation for all affected categories (old + new, deduplicated).
      // Failed revalidation must not fail the mutation.
      const allAffectedCategoryIds = [...new Set([...categoryIds, ...oldCategoryIds])].filter(
        (id) => id !== UNCATEGORIZED_CATEGORY_ID,
      );

      if (allAffectedCategoryIds.length > 0) {
        after(async () => {
          try {
            await revalidateCategoriesIfPublic(allAffectedCategoryIds, {
              operation: "set_bookmark_categories",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-category-set-bookmark-categories] after() revalidation failed", {
              category_ids: allAffectedCategoryIds,
              error: error instanceof Error ? error.message : String(error),
              user_id: userId,
            });
          }
        });

        setPayload(ctx, { revalidation_scheduled: true });
      }

      return transformedData;
    },
    inputSchema: SetBookmarkCategoriesInputSchema,
    outputSchema: SetBookmarkCategoriesOutputSchema,
    route: ROUTE,
  }),
);
