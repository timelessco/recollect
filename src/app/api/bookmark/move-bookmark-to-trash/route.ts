import * as Sentry from "@sentry/nextjs";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "@/utils/constants";

import { MoveBookmarkToTrashInputSchema, MoveBookmarkToTrashOutputSchema } from "./schema";

const ROUTE = "move-bookmark-to-trash";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { data: bookmarkData, isTrash } = data;
    const userId = user.id;

    // Extract bookmark IDs (Zod already validated these are numbers)
    const bookmarkIds = bookmarkData.map((item) => item.id);

    console.log(`[${route}] API called:`, {
      bookmarkIds,
      count: bookmarkIds.length,
      isTrash,
      userId,
    });

    // This should never happen due to Zod validation, but double-check
    if (bookmarkIds.length === 0) {
      return apiWarn({
        context: { bookmarkData },
        message: "No valid bookmark IDs provided",
        route,
        status: 400,
      });
    }

    // Set trash to current timestamp when moving to trash, null when restoring
    const trashValue = isTrash ? new Date().toISOString() : null;

    const { data: updatedBookmarks, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .update({ trash: trashValue })
      .in("id", bookmarkIds)
      .eq("user_id", userId)
      .select("id, trash");

    if (error) {
      return apiError({
        error,
        extra: { bookmarkIds, isTrash },
        message: "Failed to move bookmarks to trash",
        operation: "update_bookmark_trash",
        route,
        userId,
      });
    }

    // Check if any bookmarks were actually updated
    if (!updatedBookmarks || updatedBookmarks.length === 0) {
      console.warn(`[${route}] No bookmarks updated - may not exist or not owned by user:`, {
        bookmarkIds,
        userId,
      });
    } else {
      console.log(
        `[${route}] Successfully ${isTrash ? "trashed" : "restored"} ${updatedBookmarks.length} bookmark(s)`,
      );

      // Trigger revalidation for public categories (non-blocking)
      // Get all category IDs associated with these bookmarks
      const { data: categoryAssociations } = await supabase
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("category_id")
        .in("bookmark_id", bookmarkIds);

      if (categoryAssociations && categoryAssociations.length > 0) {
        // Extract unique category IDs
        const categoryIds = [...new Set(categoryAssociations.map((assoc) => assoc.category_id))];

        console.log(`[${route}] Triggering revalidation for categories:`, {
          bookmarkCount: updatedBookmarks.length,
          categoryIds,
        });

        // Non-blocking revalidation
        void (async () => {
          try {
            await revalidateCategoriesIfPublic(categoryIds, {
              operation: isTrash ? "bookmark_trashed" : "bookmark_restored",
              userId,
            });
          } catch (revalidationError) {
            console.error(`[${route}] Revalidation failed:`, {
              categoryIds,
              error: revalidationError,
              errorMessage:
                revalidationError instanceof Error
                  ? revalidationError.message
                  : "revalidation failed in move-bookmark-to-trash",
              errorStack: revalidationError instanceof Error ? revalidationError.stack : undefined,
              isTrash,
              userId,
            });
            Sentry.captureException(revalidationError, {
              extra: { categoryIds, isTrash, operation: "revalidation", userId },
              tags: { route: ROUTE },
            });
          }
        })();
      }
    }

    return updatedBookmarks ?? [];
  },
  inputSchema: MoveBookmarkToTrashInputSchema,
  outputSchema: MoveBookmarkToTrashOutputSchema,
  route: ROUTE,
});
