import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME, UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

const ROUTE = "remove-category-from-bookmark";

const RemoveCategoryFromBookmarkPayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" }),
	category_id: z
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

export const POST = createPostApiHandlerWithAuth({
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

		// Block manual removal of category 0 - it's auto-managed by the exclusive model
		// Users should add a real category to automatically remove category 0
		if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
			return apiWarn({
				route,
				message:
					"Cannot manually remove uncategorized. Add a real category to auto-remove it.",
				status: 400,
				context: { bookmarkId, categoryId },
			});
		}

		// 1. Verify bookmark ownership (for better error messages than RPC provides)
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

		// 2. Call RPC to remove category from bookmark
		// RPC handles: FOR UPDATE locking, deletion, auto-add of category 0 when last real category removed
		const { data: rpcData, error: rpcError } = await supabase.rpc(
			"remove_category_from_bookmark",
			{
				p_bookmark_id: bookmarkId,
				p_category_id: categoryId,
			},
		);

		if (rpcError) {
			return apiError({
				route,
				message: "Failed to remove category from bookmark",
				error: rpcError,
				operation: "rpc_remove_category_from_bookmark",
				userId,
				extra: { bookmarkId, categoryId },
			});
		}

		// RPC returns empty array if nothing was deleted (category wasn't associated)
		if (!isNonEmptyArray(rpcData)) {
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
			addedUncategorized: rpcData[0].added_uncategorized,
		});

		// Trigger revalidation if category is public (non-blocking)
		// Don't await - failed revalidation shouldn't fail the mutation
		revalidateCategoryIfPublic(categoryId, {
			operation: "remove_category_from_bookmark",
			userId,
			// eslint-disable-next-line promise/prefer-await-to-then
		}).catch((error) => {
			console.error(`[${route}] Revalidation failed:`, {
				error,
				categoryId,
				userId,
			});
		});

		return [{ bookmark_id: bookmarkId, category_id: categoryId }];
	},
});
