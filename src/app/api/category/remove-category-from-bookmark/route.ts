import { isEmpty } from "lodash";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNullable } from "@/utils/assertion-utils";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "remove-category-from-bookmark";

const RemoveCategoryFromBookmarkPayloadSchema = z.object({
	bookmark_id: z
		.number({
			error: (issue) =>
				isNullable(issue.input)
					? "Bookmark ID is required"
					: "Bookmark ID must be a number",
		})
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" }),
	category_id: z
		.number({
			error: (issue) =>
				isNullable(issue.input)
					? "Collection ID is required"
					: "Collection ID must be a number",
		})
		.int({ error: "Collection ID must be a whole number" })
		.min(0, { error: "Collection ID must be non-negative" }),
});

export type RemoveCategoryFromBookmarkPayload = z.infer<
	typeof RemoveCategoryFromBookmarkPayloadSchema
>;

const RemoveCategoryFromBookmarkResponseSchema = z.array(
	z.object({
		bookmark_id: z.number(),
		category_id: z.number(),
	}),
);

export type RemoveCategoryFromBookmarkResponse = z.infer<
	typeof RemoveCategoryFromBookmarkResponseSchema
>;

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: RemoveCategoryFromBookmarkPayloadSchema,
	outputSchema: RemoveCategoryFromBookmarkResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_id: bookmarkId, category_id: categoryId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkId,
			categoryId,
		});

		// Block removal of category 0 (permanent base category)
		if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
			return apiWarn({
				route,
				message: "Cannot remove the uncategorized category",
				status: 400,
				context: { bookmarkId, categoryId },
			});
		}

		// 1. Verify bookmark ownership
		const { error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("id")
			.eq("id", bookmarkId)
			.eq("user_id", userId)
			.single();

		if (bookmarkError) {
			if (bookmarkError.code === "PGRST116") {
				return apiWarn({
					route,
					message: "Bookmark not found or not owned by user",
					status: 404,
					context: { bookmarkId },
				});
			}

			return apiError({
				route,
				message: "Failed to fetch bookmark",
				error: bookmarkError,
				operation: "fetch_bookmark",
				userId,
				extra: { bookmarkId },
			});
		}

		console.log(`[${route}] Bookmark ownership verified`);

		// 2. Delete the bookmark_category entry
		// Category 0 is always present, so bookmark won't be orphaned
		const { data: deletedData, error: deleteError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.delete()
			.eq("bookmark_id", bookmarkId)
			.eq("category_id", categoryId)
			.select();

		if (deleteError) {
			return apiError({
				route,
				message: "Failed to remove category from bookmark",
				error: deleteError,
				operation: "delete_bookmark_category",
				userId,
				extra: { bookmarkId, categoryId },
			});
		}

		if (isEmpty(deletedData)) {
			return apiWarn({
				route,
				message: "Category association not found",
				status: 404,
				context: { bookmarkId, categoryId },
			});
		}

		console.log(`[${route}] Category removed successfully:`, {
			bookmarkId,
			categoryId,
		});

		return deletedData;
	},
});
