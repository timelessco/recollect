import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
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
	category_order: z.array(z.number()),
});

export type DeleteCategoryPayload = z.infer<typeof DeleteCategoryInputSchema>;

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

export type DeleteCategoryResponse = z.infer<
	typeof DeleteCategoryResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: DeleteCategoryInputSchema,
	outputSchema: DeleteCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id: categoryId, category_order: categoryOrder } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, categoryId });

		// Verify the user owns the category
		const { data: categoryData, error: categoryDataError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id")
			.eq("id", categoryId);

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

		if (!categoryData?.length) {
			return apiWarn({
				route,
				message: "Category not found",
				status: 404,
				context: { categoryId, userId },
			});
		}

		const isOwner = categoryData[0].user_id === userId;

		if (!isOwner) {
			return apiWarn({
				route,
				message: "Only collection owner can delete this collection",
				status: 403,
				context: { categoryId, userId },
			});
		}

		// Delete shared category associations
		const { error: sharedCategoryError } = await supabase
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

		// Get all bookmark IDs in this category
		const { data: categoryBookmarks, error: categoryBookmarksError } =
			await supabase
				.from(BOOKMARK_CATEGORIES_TABLE_NAME)
				.select("bookmark_id")
				.eq("category_id", categoryId)
				.eq("user_id", userId);

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

		// Move all bookmarks in this category to trash
		if (isNonEmptyArray(categoryBookmarks)) {
			const bookmarkIds = categoryBookmarks.map((b) => b.bookmark_id);

			// Only trash bookmarks that aren't already trashed
			const { error: trashError } = await supabase
				.from(MAIN_TABLE_NAME)
				.update({ trash: new Date().toISOString() })
				.in("id", bookmarkIds)
				.eq("user_id", userId)
				.is("trash", null);

			if (trashError) {
				return apiError({
					route,
					message: "Failed to move bookmarks to trash",
					error: trashError,
					operation: "delete_category_trash_bookmarks",
					userId,
					extra: { categoryId, bookmarkCount: bookmarkIds.length },
				});
			}

			console.log(`[${route}] Moved bookmarks to trash:`, {
				categoryId,
				count: bookmarkIds.length,
			});
		}

		// Delete all junction entries for this category
		const { error: junctionDeleteError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.delete()
			.eq("category_id", categoryId)
			.eq("user_id", userId);

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
		const { data: deletedCategory, error: deleteError } = await supabase
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
			return apiError({
				route,
				message: "Category not found or already deleted",
				error: new Error("Empty delete result"),
				operation: "delete_category_empty",
				userId,
				extra: { categoryId },
			});
		}

		// Update user's category order
		const { error: orderError } = await supabase
			.from(PROFILES)
			.update({
				category_order: categoryOrder.filter(
					(item) => item !== deletedCategory[0].id,
				),
			})
			.match({ id: userId })
			.select("id, category_order");

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

		console.log(`[${route}] Category deleted:`, {
			categoryId: deletedCategory[0].id,
			categoryName: deletedCategory[0].category_name,
		});

		return deletedCategory;
	},
});
