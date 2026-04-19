import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "@/utils/constants";

import { MoveBookmarkToTrashInputSchema, MoveBookmarkToTrashOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-move-bookmark-to-trash";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { data: bookmarkData, isTrash } = data;
      const userId = user.id;
      const bookmarkIds = bookmarkData.map((item) => item.id);

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_ids_count = bookmarkIds.length;
        ctx.fields.is_trash = isTrash;
      }

      const trashValue = isTrash ? new Date().toISOString() : null;

      const { data: updatedBookmarks, error: updateError } = await supabase
        .from(MAIN_TABLE_NAME)
        .update({ trash: trashValue })
        .in("id", bookmarkIds)
        .eq("user_id", userId)
        .select("id, trash");

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          context: { bookmark_ids_count: bookmarkIds.length, is_trash: isTrash },
          message: "Failed to move bookmarks to trash",
          operation: "update_bookmark_trash",
        });
      }

      if (!updatedBookmarks || updatedBookmarks.length === 0) {
        if (ctx?.fields) {
          ctx.fields.updated_count = 0;
          ctx.fields.no_bookmarks_updated = true;
        }
        return [];
      }

      if (ctx?.fields) {
        ctx.fields.updated_count = updatedBookmarks.length;
        ctx.fields.bookmarks_trashed = isTrash;
      }

      // Look up affected categories pre-response so we can fan out revalidation
      // inside after(). The v1 route also queried this pre-response.
      const { data: categoryAssociations, error: associationsError } = await supabase
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("category_id")
        .in("bookmark_id", bookmarkIds);

      if (associationsError && ctx?.fields) {
        ctx.fields.category_associations_fetch_error = associationsError.message;
      }

      if (categoryAssociations && categoryAssociations.length > 0) {
        const categoryIds = [...new Set(categoryAssociations.map((assoc) => assoc.category_id))];

        if (ctx?.fields) {
          ctx.fields.revalidation_category_count = categoryIds.length;
          ctx.fields.revalidation_queued = true;
        }

        // Closure-capture values — ALS is gone inside after()
        after(async () => {
          try {
            await revalidateCategoriesIfPublic(categoryIds, {
              operation: isTrash ? "bookmark_trashed" : "bookmark_restored",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-bookmark-move-bookmark-to-trash] after() revalidation failed", {
              category_ids_count: categoryIds.length,
              is_trash: isTrash,
              user_id: userId,
              error_message: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }

      return updatedBookmarks;
    },
    inputSchema: MoveBookmarkToTrashInputSchema,
    outputSchema: MoveBookmarkToTrashOutputSchema,
    route: ROUTE,
  }),
);
