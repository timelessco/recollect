import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
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

import { DeleteUserCategoryInputSchema, DeleteUserCategoryOutputSchema } from "./schema";

const ROUTE = "v2-category-delete-user-category";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { category_id: categoryId, keep_bookmarks: keepBookmarks } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_id = categoryId;
        ctx.fields.keep_bookmarks = keepBookmarks;
      }

      // Verify the user owns the category
      const { data: categoryData, error: categoryDataError } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("user_id, is_public, category_slug")
        .eq("id", categoryId)
        .single();

      if (categoryDataError) {
        // PGRST116 = no rows found
        if (categoryDataError.code === "PGRST116") {
          throw new RecollectApiError("not_found", {
            cause: categoryDataError,
            message: "Category not found",
            operation: "delete_category_fetch",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: categoryDataError,
          message: "Failed to fetch category data",
          operation: "delete_category_fetch",
        });
      }

      if (!categoryData) {
        throw new RecollectApiError("not_found", {
          message: "Category not found",
          operation: "delete_category_fetch",
        });
      }

      if (categoryData.user_id !== userId) {
        throw new RecollectApiError("forbidden", {
          message: "Only collection owner can delete this collection",
          operation: "delete_category_ownership_check",
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

      if (collaboratorsError && ctx?.fields) {
        ctx.fields.collaborator_fetch_error = collaboratorsError.message;
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
        throw new RecollectApiError("service_unavailable", {
          cause: sharedCategoryError,
          message: "Failed to delete shared category associations",
          operation: "delete_shared_categories",
        });
      }

      if (ctx?.fields) {
        ctx.fields.shared_categories_deleted = true;
      }

      // Get all bookmark IDs in this category with their owners
      const { data: categoryBookmarks, error: categoryBookmarksError } = await serviceClient
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("bookmark_id, user_id")
        .eq("category_id", categoryId);

      if (categoryBookmarksError) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoryBookmarksError,
          message: "Failed to fetch bookmarks in category",
          operation: "delete_category_fetch_bookmarks",
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
            throw new RecollectApiError("service_unavailable", {
              cause: multiCategoryError,
              message: "Failed to check bookmark category associations",
              operation: "delete_category_check_orphans",
            });
          }

          const multiCategoryIds = new Set(
            (multiCategoryBookmarks ?? []).map((b) => b.bookmark_id),
          );

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
              throw new RecollectApiError("service_unavailable", {
                cause: uncategorizedError,
                context: { orphaned_count: orphanedBookmarks.length },
                message: "Failed to assign Uncategorized to orphaned bookmarks",
                operation: "delete_category_assign_uncategorized",
              });
            }

            if (ctx?.fields) {
              ctx.fields.orphaned_bookmarks_reassigned = orphanedBookmarks.length;
            }
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
              .eq("user_id", userId)
              .is("trash", null);

            if (trashError) {
              throw new RecollectApiError("service_unavailable", {
                cause: trashError,
                context: { bookmark_count: ownerBookmarkIds.length },
                message: "Failed to move bookmarks to trash",
                operation: "delete_category_trash_bookmarks",
              });
            }

            if (ctx?.fields) {
              ctx.fields.bookmarks_trashed = ownerBookmarkIds.length;
            }
          }
        }
      }

      // Delete all junction entries for this category
      const { error: junctionDeleteError } = await serviceClient
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .delete()
        .eq("category_id", categoryId);

      if (junctionDeleteError) {
        throw new RecollectApiError("service_unavailable", {
          cause: junctionDeleteError,
          message: "Failed to delete category associations",
          operation: "delete_category_junction",
        });
      }

      if (ctx?.fields) {
        ctx.fields.junction_entries_deleted = true;
      }

      // Delete the category
      const { data: deletedCategory, error: deleteError } = await serviceClient
        .from(CATEGORIES_TABLE_NAME)
        .delete()
        .eq("id", categoryId)
        .eq("user_id", userId)
        .select("*");

      if (deleteError) {
        throw new RecollectApiError("service_unavailable", {
          cause: deleteError,
          message: "Failed to delete category",
          operation: "delete_category",
        });
      }

      if (!isNonEmptyArray(deletedCategory)) {
        throw new RecollectApiError("not_found", {
          message: "Category not found or already deleted",
          operation: "delete_category",
        });
      }

      // Fetch current category order from DB to avoid stale data
      const { data: profileData, error: profileFetchError } = await supabase
        .from(PROFILES)
        .select("category_order")
        .match({ id: userId })
        .single();

      if (profileFetchError) {
        throw new RecollectApiError("service_unavailable", {
          cause: profileFetchError,
          message: "Failed to fetch user profile",
          operation: "delete_category_fetch_profile",
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
          throw new RecollectApiError("service_unavailable", {
            cause: orderError,
            message: "Failed to update category order",
            operation: "delete_category_update_order",
          });
        }

        if (ctx?.fields) {
          ctx.fields.category_order_updated = true;
        }
      }

      // Clean up favorite_categories for ALL users who favorited this category
      // Uses serviceClient because this SECURITY DEFINER function is not granted to authenticated
      const { error: favoritesCleanupError } = await serviceClient.rpc(
        "remove_category_from_all_favorites",
        { p_category_id: deletedCategory[0].id },
      );

      if (favoritesCleanupError && ctx?.fields) {
        ctx.fields.favorites_cleanup_error = favoritesCleanupError.message;
        ctx.fields.favorites_cleanup_code = favoritesCleanupError.code;
      }

      if (ctx?.fields) {
        ctx.fields.category_deleted = true;
      }

      // Revalidate public category page if it was public — run after the
      // response so the profile lookup and revalidation fetch don't block the
      // delete, and so any rejection is caught instead of floating.
      if (categoryData.is_public) {
        const categorySlug = categoryData.category_slug;
        after(async () => {
          try {
            const { data: profileUserData, error: profileError } = await supabase
              .from(PROFILES)
              .select("user_name")
              .eq("id", userId)
              .single();

            if (profileError) {
              logger.warn("[v2-category-delete-user-category] revalidation profile fetch failed", {
                category_id: categoryId,
                error_message: profileError.message,
                user_id: userId,
              });
              return;
            }

            const userName = profileUserData?.user_name;
            if (!userName) {
              return;
            }

            await revalidatePublicCategoryPage(userName, categorySlug, {
              categoryId,
              operation: "delete_category",
              userId,
            });
          } catch (error) {
            logger.warn("[v2-category-delete-user-category] after() revalidation failed", {
              category_id: categoryId,
              error_message: error instanceof Error ? error.message : String(error),
              user_id: userId,
            });
          }
        });

        if (ctx?.fields) {
          ctx.fields.revalidation_scheduled = true;
        }
      }

      // Notify collaborators about the deletion — run after response is sent
      if (isNonEmptyArray(collaboratorEmails)) {
        const deletedCategoryName = deletedCategory[0].category_name ?? "Untitled";
        after(async () => {
          try {
            const { data: ownerProfile, error: ownerProfileError } = await supabase
              .from(PROFILES)
              .select("display_name, user_name")
              .eq("id", userId)
              .single();

            if (ownerProfileError) {
              logger.warn("[v2-category-delete-user-category] owner profile fetch failed", {
                category_id: categoryId,
                user_id: userId,
                error_message: ownerProfileError.message,
              });
            }

            const ownerDisplayName =
              ownerProfile?.display_name ?? ownerProfile?.user_name ?? "the collection owner";

            await sendCollectionDeletedNotification({
              categoryName: deletedCategoryName,
              collaboratorEmails,
              ownerDisplayName,
            });
          } catch (error) {
            logger.warn("[v2-category-delete-user-category] collaborator notification failed", {
              category_id: categoryId,
              user_id: userId,
              error_message: error instanceof Error ? error.message : String(error),
            });
          }
        });

        if (ctx?.fields) {
          ctx.fields.collaborator_notification_queued = collaboratorEmails.length;
        }
      }

      return deletedCategory;
    },
    inputSchema: DeleteUserCategoryInputSchema,
    outputSchema: DeleteUserCategoryOutputSchema,
    route: ROUTE,
  }),
);
