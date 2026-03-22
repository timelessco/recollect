import { after } from "next/server";

import * as Sentry from "@sentry/nextjs";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { sendCollectionDeletedNotification } from "@/lib/email/send-collection-deleted-notification";
import { revalidatePublicCategoryPage } from "@/lib/revalidation-helpers";
import { createServerServiceClient } from "@/lib/supabase/service";
import { isNonEmptyArray, isNonNullable } from "@/utils/assertion-utils";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  PROFILES,
  SHARED_CATEGORIES_TABLE_NAME,
} from "@/utils/constants";

import { DeleteCategoryInputSchema, DeleteCategoryResponseSchema } from "./schema";

const ROUTE = "delete-user-category";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { category_id: categoryId, keep_bookmarks: keepBookmarks } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { categoryId, userId });

    // Verify the user owns the category
    const { data: categoryData, error: categoryDataError } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select("user_id, is_public, category_slug")
      .eq("id", categoryId)
      .single();

    if (categoryDataError) {
      return apiError({
        error: categoryDataError,
        extra: { categoryId },
        message: "Failed to fetch category data",
        operation: "delete_category_fetch",
        route,
        userId,
      });
    }

    if (!categoryData) {
      return apiWarn({
        context: { categoryId, userId },
        message: "Category not found",
        route,
        status: 404,
      });
    }

    const isOwner = categoryData.user_id === userId;

    if (!isOwner) {
      return apiWarn({
        context: { categoryId, userId },
        message: "Only collection owner can delete this collection",
        route,
        status: 403,
      });
    }

    // Use service client to bypass RLS for cross-user cleanup
    const serviceClient = createServerServiceClient();

    // Query accepted collaborator emails before deleting shared_categories
    const { data: collaborators, error: collaboratorsError } = await serviceClient
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select("email")
      .eq("category_id", categoryId)
      .eq("is_accept_pending", false);

    if (collaboratorsError) {
      console.error(`[${route}] Failed to fetch collaborator emails, skipping notification:`, {
        categoryId,
        error: collaboratorsError,
      });
    }

    const collaboratorEmails: string[] = (collaborators ?? [])
      .map((collaborator) => collaborator.email)
      .filter(isNonNullable);

    // Delete shared category associations
    const { error: sharedCategoryError } = await serviceClient
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .delete()
      .eq("category_id", categoryId);

    if (sharedCategoryError) {
      return apiError({
        error: sharedCategoryError,
        extra: { categoryId },
        message: "Failed to delete shared category associations",
        operation: "delete_shared_categories",
        route,
        userId,
      });
    }

    console.log(`[${route}] Deleted shared category associations:`, {
      categoryId,
    });

    // Get all bookmark IDs in this category with their owners
    const { data: categoryBookmarks, error: categoryBookmarksError } = await serviceClient
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .select("bookmark_id, user_id")
      .eq("category_id", categoryId);

    if (categoryBookmarksError) {
      return apiError({
        error: categoryBookmarksError,
        extra: { categoryId },
        message: "Failed to fetch bookmarks in category",
        operation: "delete_category_fetch_bookmarks",
        route,
        userId,
      });
    }

    if (isNonEmptyArray(categoryBookmarks)) {
      if (keepBookmarks) {
        // Preserve bookmarks: auto-assign Uncategorized for orphaned ones
        const categoryBookmarkIds = categoryBookmarks.map((b) => b.bookmark_id);

        // Find bookmarks that also belong to other categories
        const { data: multiCategoryBookmarks, error: multiCategoryError } = await serviceClient
          .from(BOOKMARK_CATEGORIES_TABLE_NAME)
          .select("bookmark_id")
          .in("bookmark_id", categoryBookmarkIds)
          .neq("category_id", categoryId);

        if (multiCategoryError) {
          return apiError({
            error: multiCategoryError,
            extra: { categoryId },
            message: "Failed to check bookmark category associations",
            operation: "delete_category_check_orphans",
            route,
            userId,
          });
        }

        const multiCategoryIds = new Set((multiCategoryBookmarks ?? []).map((b) => b.bookmark_id));

        // Owner bookmarks that ONLY belong to this category need Uncategorized
        const orphanedBookmarks = categoryBookmarks.filter(
          (b) => b.user_id === userId && !multiCategoryIds.has(b.bookmark_id),
        );

        if (isNonEmptyArray(orphanedBookmarks)) {
          const { error: uncategorizedError } = await serviceClient
            .from(BOOKMARK_CATEGORIES_TABLE_NAME)
            .upsert(
              orphanedBookmarks.map((b) => ({
                bookmark_id: b.bookmark_id,
                category_id: 0,
                user_id: b.user_id,
              })),
              { onConflict: "bookmark_id,category_id" },
            );

          if (uncategorizedError) {
            return apiError({
              error: uncategorizedError,
              extra: {
                categoryId,
                orphanedCount: orphanedBookmarks.length,
              },
              message: "Failed to assign Uncategorized to orphaned bookmarks",
              operation: "delete_category_assign_uncategorized",
              route,
              userId,
            });
          }

          console.log(`[${route}] Assigned Uncategorized to orphaned bookmarks:`, {
            categoryId,
            count: orphanedBookmarks.length,
          });
        }
      } else {
        // Trash owner's bookmarks, collaborators just lose the reference
        const ownerBookmarkIds = categoryBookmarks
          .filter((b) => b.user_id === userId)
          .map((b) => b.bookmark_id);

        if (isNonEmptyArray(ownerBookmarkIds)) {
          const { error: trashError } = await serviceClient
            .from(MAIN_TABLE_NAME)
            .update({ trash: new Date().toISOString() })
            .in("id", ownerBookmarkIds)
            .is("trash", null);

          if (trashError) {
            return apiError({
              error: trashError,
              extra: {
                bookmarkCount: ownerBookmarkIds.length,
                categoryId,
              },
              message: "Failed to move bookmarks to trash",
              operation: "delete_category_trash_bookmarks",
              route,
              userId,
            });
          }

          console.log(`[${route}] Moved owner bookmarks to trash:`, {
            categoryId,
            count: ownerBookmarkIds.length,
          });
        }
      }
    }

    // Delete all junction entries for this category
    const { error: junctionDeleteError } = await serviceClient
      .from(BOOKMARK_CATEGORIES_TABLE_NAME)
      .delete()
      .eq("category_id", categoryId);

    if (junctionDeleteError) {
      return apiError({
        error: junctionDeleteError,
        extra: { categoryId },
        message: "Failed to delete category associations",
        operation: "delete_category_junction",
        route,
        userId,
      });
    }

    console.log(`[${route}] Deleted junction entries:`, { categoryId });

    // Delete the category
    const { data: deletedCategory, error: deleteError } = await serviceClient
      .from(CATEGORIES_TABLE_NAME)
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userId)
      .select("*");

    if (deleteError) {
      return apiError({
        error: deleteError,
        extra: { categoryId },
        message: "Failed to delete category",
        operation: "delete_category",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(deletedCategory)) {
      return apiWarn({
        context: { categoryId, userId },
        message: "Category not found or already deleted",
        route,
        status: 404,
      });
    }

    // Fetch current category order from DB to avoid stale data
    const { data: profileData, error: profileFetchError } = await supabase
      .from(PROFILES)
      .select("category_order")
      .match({ id: userId })
      .single();

    if (profileFetchError) {
      return apiError({
        error: profileFetchError,
        extra: { categoryId },
        message: "Failed to fetch user profile",
        operation: "delete_category_fetch_profile",
        route,
        userId,
      });
    }

    const currentOrder = profileData?.category_order;

    if (Array.isArray(currentOrder)) {
      const { error: orderError } = await supabase
        .from(PROFILES)
        .update({
          category_order: currentOrder.filter((item: number) => item !== deletedCategory[0].id),
        })
        .match({ id: userId });

      if (orderError) {
        return apiError({
          error: orderError,
          extra: { categoryId },
          message: "Failed to update category order",
          operation: "delete_category_update_order",
          route,
          userId,
        });
      }
    }

    // Clean up favorite_categories for ALL users who favorited this category
    // Uses serviceClient because this SECURITY DEFINER function is not granted to authenticated
    const { error: favoritesCleanupError } = await serviceClient.rpc(
      "remove_category_from_all_favorites",
      { p_category_id: deletedCategory[0].id },
    );

    if (favoritesCleanupError) {
      console.error(`[${route}] Failed to clean up favorite_categories:`, {
        categoryId: deletedCategory[0].id,
        error: favoritesCleanupError,
      });
      Sentry.captureException(new Error(favoritesCleanupError.message), {
        extra: {
          categoryId: deletedCategory[0].id,
          code: favoritesCleanupError.code,
          details: favoritesCleanupError.details,
          hint: favoritesCleanupError.hint,
        },
        tags: { operation: "cleanup_all_favorite_categories", userId },
      });
    }

    console.log(`[${route}] Category deleted:`, {
      categoryId: deletedCategory[0].id,
      categoryName: deletedCategory[0].category_name,
    });

    // Revalidate public category page if it was public
    // This is a non-blocking operation - don't await it
    if (categoryData.is_public) {
      // Fetch user_name for revalidation
      const { data: profileUserData, error: profileError } = await supabase
        .from(PROFILES)
        .select("user_name")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(`[${route}] Failed to fetch user profile for revalidation:`, {
          categoryId,
          error: profileError,
          userId,
        });
      }

      const userName = profileUserData?.user_name;
      if (userName) {
        console.log(`[${route}] Triggering revalidation for deleted category:`, {
          categoryId,
          categorySlug: categoryData.category_slug,
          userName,
        });

        // Fire and forget - don't block the API response
        void revalidatePublicCategoryPage(userName, categoryData.category_slug, {
          categoryId,
          operation: "delete_category",
          userId,
        });
      }
    }

    // Notify collaborators about the deletion - run after response is sent
    if (isNonEmptyArray(collaboratorEmails)) {
      after(async () => {
        const { data: ownerProfile, error: ownerProfileError } = await supabase
          .from(PROFILES)
          .select("display_name, user_name")
          .eq("id", userId)
          .single();

        if (ownerProfileError) {
          console.error(`[${route}] Failed to fetch owner profile for notification:`, {
            error: ownerProfileError,
            userId,
          });
        }

        const ownerDisplayName =
          ownerProfile?.display_name ?? ownerProfile?.user_name ?? "the collection owner";

        await sendCollectionDeletedNotification({
          categoryName: deletedCategory[0].category_name ?? "Untitled",
          collaboratorEmails,
          ownerDisplayName,
        });
      });
    }

    return deletedCategory;
  },
  inputSchema: DeleteCategoryInputSchema,
  outputSchema: DeleteCategoryResponseSchema,
  route: ROUTE,
});
