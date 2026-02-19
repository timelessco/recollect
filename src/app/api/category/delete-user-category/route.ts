import { z } from "zod";

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

const ROUTE = "delete-user-category";

const DeleteCategoryInputSchema = z.object({
	category_id: z.number(),
});

const DeleteCategoryResponseSchema = z
	.array(
		z.object({
			category_name: z.string().nullable(),
			category_slug: z.string(),
			category_views: z.unknown().nullable(),
			created_at: z.string().nullable(),
			icon: z.string().nullable(),
			icon_color: z.string().nullable(),
			id: z.number(),
			is_public: z.boolean(),
			order_index: z.number().nullable(),
			user_id: z.string().nullable(),
		}),
	)
	.nonempty();

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: DeleteCategoryInputSchema,
	outputSchema: DeleteCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id: categoryId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, categoryId });

		// Verify the user owns the category
		const { data: categoryData, error: categoryDataError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id, is_public, category_slug")
			.eq("id", categoryId)
			.single();

		if (categoryDataError) {
			return apiError({
				route,
				message: "Failed to fetch category data",
				error: categoryDataError,
				operation: "delete_category_fetch",
				userId,
				extra: { categoryId },
			});
		}

		if (!categoryData) {
			return apiWarn({
				route,
				message: "Category not found",
				status: 404,
				context: { categoryId, userId },
			});
		}

		const isOwner = categoryData.user_id === userId;

		if (!isOwner) {
			return apiWarn({
				route,
				message: "Only collection owner can delete this collection",
				status: 403,
				context: { categoryId, userId },
			});
		}

		// Use service client to bypass RLS for cross-user cleanup
		const serviceClient = await createServerServiceClient();

		// Query accepted collaborator emails before deleting shared_categories
		const { data: collaborators } = await serviceClient
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select("email")
			.eq("category_id", categoryId)
			.eq("is_accept_pending", false);

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
				route,
				message: "Failed to delete shared category associations",
				error: sharedCategoryError,
				operation: "delete_shared_categories",
				userId,
				extra: { categoryId },
			});
		}

		console.log(`[${route}] Deleted shared category associations:`, {
			categoryId,
		});

		// Get all bookmark IDs in this category with their owners
		const { data: categoryBookmarks, error: categoryBookmarksError } =
			await serviceClient
				.from(BOOKMARK_CATEGORIES_TABLE_NAME)
				.select("bookmark_id, user_id")
				.eq("category_id", categoryId);

		if (categoryBookmarksError) {
			return apiError({
				route,
				message: "Failed to fetch bookmarks in category",
				error: categoryBookmarksError,
				operation: "delete_category_fetch_bookmarks",
				userId,
				extra: { categoryId },
			});
		}

		// Trash only the owner's bookmarks, collaborators just lose the reference
		if (isNonEmptyArray(categoryBookmarks)) {
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
						route,
						message: "Failed to move bookmarks to trash",
						error: trashError,
						operation: "delete_category_trash_bookmarks",
						userId,
						extra: { categoryId, bookmarkCount: ownerBookmarkIds.length },
					});
				}

				console.log(`[${route}] Moved owner bookmarks to trash:`, {
					categoryId,
					count: ownerBookmarkIds.length,
				});
			}
		}

		// Delete all junction entries for this category
		const { error: junctionDeleteError } = await serviceClient
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.delete()
			.eq("category_id", categoryId);

		if (junctionDeleteError) {
			return apiError({
				route,
				message: "Failed to delete category associations",
				error: junctionDeleteError,
				operation: "delete_category_junction",
				userId,
				extra: { categoryId },
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
				route,
				message: "Failed to delete category",
				error: deleteError,
				operation: "delete_category",
				userId,
				extra: { categoryId },
			});
		}

		if (!isNonEmptyArray(deletedCategory)) {
			return apiWarn({
				route,
				message: "Category not found or already deleted",
				status: 404,
				context: { categoryId, userId },
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
				route,
				message: "Failed to fetch user profile",
				error: profileFetchError,
				operation: "delete_category_fetch_profile",
				userId,
				extra: { categoryId },
			});
		}

		const currentOrder = profileData?.category_order;

		if (Array.isArray(currentOrder)) {
			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({
					category_order: currentOrder.filter(
						(item: number) => item !== deletedCategory[0].id,
					),
				})
				.match({ id: userId });

			if (orderError) {
				return apiError({
					route,
					message: "Failed to update category order",
					error: orderError,
					operation: "delete_category_update_order",
					userId,
					extra: { categoryId },
				});
			}
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
				console.error(
					`[${route}] Failed to fetch user profile for revalidation:`,
					{
						error: profileError,
						categoryId,
						userId,
					},
				);
			}

			const userName = profileUserData?.user_name;
			if (userName) {
				console.log(
					`[${route}] Triggering revalidation for deleted category:`,
					{
						categoryId,
						categorySlug: categoryData.category_slug,
						userName,
					},
				);

				// Fire and forget - don't block the API response
				void revalidatePublicCategoryPage(
					userName,
					categoryData.category_slug,
					{
						operation: "delete_category",
						userId,
						categoryId,
					},
				);
			}
		}

		// Notify collaborators about the deletion
		if (isNonEmptyArray(collaboratorEmails)) {
			const { data: ownerProfile } = await supabase
				.from(PROFILES)
				.select("display_name, user_name")
				.eq("id", userId)
				.single();

			const ownerDisplayName =
				ownerProfile?.display_name ||
				ownerProfile?.user_name ||
				"the collection owner";

			void sendCollectionDeletedNotification({
				categoryName: deletedCategory[0].category_name ?? "Untitled",
				collaboratorEmails,
				ownerDisplayName,
			});
		}

		return deletedCategory;
	},
});
