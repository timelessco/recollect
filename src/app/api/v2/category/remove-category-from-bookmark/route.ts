import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME, UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

import {
  RemoveCategoryFromBookmarkInputSchema,
  RemoveCategoryFromBookmarkOutputSchema,
} from "./schema";

const ROUTE = "v2-category-remove-category-from-bookmark";

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

      // Block manual removal of category 0 — it's auto-managed by the exclusive model.
      // Users should add a real category to automatically remove category 0.
      if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
        throw new RecollectApiError("bad_request", {
          message: "Cannot manually remove uncategorized. Add a real category to auto-remove it.",
          operation: "remove_uncategorized_blocked",
        });
      }

      // 1. Verify bookmark ownership (for better error messages than RPC provides).
      const { error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("id")
        .eq("id", bookmarkId)
        .eq("user_id", userId)
        .single();

      if (bookmarkError) {
        if (bookmarkError.code === "PGRST116") {
          throw new RecollectApiError("not_found", {
            message: "Bookmark not found or not owned by user",
            operation: "verify_bookmark_ownership",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to fetch bookmark",
          operation: "fetch_bookmark",
        });
      }

      // 2. Call RPC to remove category from bookmark.
      // RPC handles: FOR UPDATE locking, deletion, auto-add of category 0 when last real category removed.
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "remove_category_from_bookmark",
        {
          p_bookmark_id: bookmarkId,
          p_category_id: categoryId,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to remove category from bookmark",
          operation: "rpc_remove_category_from_bookmark",
        });
      }

      // RPC returns empty array if nothing was deleted (category wasn't associated).
      if (!isNonEmptyArray(rpcData)) {
        throw new RecollectApiError("not_found", {
          message: "Category association not found",
          operation: "category_association_missing",
        });
      }

      setPayload(ctx, {
        added_uncategorized: rpcData[0].added_uncategorized,
        category_removed: true,
      });

      // Trigger revalidation if category is public (non-blocking).
      // Failed revalidation must not fail the mutation.
      after(async () => {
        try {
          await revalidateCategoryIfPublic(categoryId, {
            operation: "remove_category_from_bookmark",
            userId,
          });
        } catch (error) {
          logger.warn("[v2-category-remove-category-from-bookmark] after() revalidation failed", {
            category_id: categoryId,
            error: error instanceof Error ? error.message : String(error),
            user_id: userId,
          });
        }
      });

      return [{ bookmark_id: bookmarkId, category_id: categoryId }];
    },
    inputSchema: RemoveCategoryFromBookmarkInputSchema,
    outputSchema: RemoveCategoryFromBookmarkOutputSchema,
    route: ROUTE,
  }),
);
