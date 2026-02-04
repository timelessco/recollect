import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "set-bookmark-categories";

const SetBookmarkCategoriesPayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" }),
	category_ids: z
		.array(
			z
				.int({ error: "Collection ID must be a whole number" })
				.min(0, { error: "Collection ID must be non-negative" }),
		)
		.max(100, { error: "Cannot add more than 100 collections to a bookmark" })
		.refine((ids) => new Set(ids).size === ids.length, {
			error: "Duplicate collection IDs not allowed",
		}),
});

export type SetBookmarkCategoriesPayload = z.infer<
	typeof SetBookmarkCategoriesPayloadSchema
>;

const SetBookmarkCategoriesResponseSchema = z.array(
	z.object({
		bookmark_id: z.number(),
		category_id: z.number(),
	}),
);

export type SetBookmarkCategoriesResponse = z.infer<
	typeof SetBookmarkCategoriesResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: SetBookmarkCategoriesPayloadSchema,
	outputSchema: SetBookmarkCategoriesResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_id: bookmarkId, category_ids: categoryIds } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkId,
			categoryIds,
		});

		// Filter non-zero categories for ownership verification
		const nonZeroCategoryIds = categoryIds.filter(
			(id) => id !== UNCATEGORIZED_CATEGORY_ID,
		);

		// 1. Verify bookmark ownership + owned categories in parallel
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

		// Handle bookmark check result
		if (bookmarkResult.error) {
			if (bookmarkResult.error.code === "PGRST116") {
				return apiWarn({
					route,
					message: "Bookmark not found or not owned by user",
					status: 404,
					context: { bookmarkId },
				});
			}

			return apiError({
				route,
				message: "Failed to verify bookmark ownership",
				error: bookmarkResult.error,
				operation: "fetch_bookmark",
				userId,
				extra: { bookmarkId },
			});
		}

		// 2. Verify access to all non-zero categories
		if (nonZeroCategoryIds.length > 0) {
			if (ownedCategoriesResult.error) {
				return apiError({
					route,
					message: "Failed to fetch categories",
					error: ownedCategoriesResult.error,
					operation: "fetch_owned_categories",
					userId,
					extra: { categoryIds: nonZeroCategoryIds },
				});
			}

			const ownedCategoryIds = new Set(
				ownedCategoriesResult.data?.map((cat) => cat.id),
			);
			const notOwnedCategoryIds = nonZeroCategoryIds.filter(
				(id) => !ownedCategoryIds.has(id),
			);

			// For categories not owned, check shared access
			const email = user.email;
			if (notOwnedCategoryIds.length > 0 && email) {
				const { data: sharedCategories, error: sharedCategoriesError } =
					await supabase
						.from(SHARED_CATEGORIES_TABLE_NAME)
						.select("category_id, edit_access")
						.eq("email", email)
						.in("category_id", notOwnedCategoryIds);

				if (sharedCategoriesError) {
					return apiError({
						route,
						message: "Failed to fetch shared categories",
						error: sharedCategoriesError,
						operation: "fetch_shared_categories",
						userId,
						extra: { categoryIds: notOwnedCategoryIds, email },
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
					return apiWarn({
						route,
						message: `No access to categories: ${unauthorizedCategoryIds.join(", ")}`,
						status: 403,
						context: { userId, unauthorizedCategoryIds },
					});
				}
			} else if (notOwnedCategoryIds.length > 0) {
				return apiWarn({
					route,
					message: `No access to categories: ${notOwnedCategoryIds.join(", ")}`,
					status: 403,
					context: { userId, notOwnedCategoryIds },
				});
			}
		}

		console.log(`[${route}] Category access verified`);

		// 3. Get existing categories for this bookmark (for revalidation)
		const { data: existingCategories } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select("category_id")
			.eq("bookmark_id", bookmarkId);

		const existingCategoryIds =
			existingCategories?.map((cat) => cat.category_id) ?? [];

		// 4. Atomically replace bookmark categories via RPC
		const { data: insertedData, error: rpcError } = await supabase.rpc(
			"set_bookmark_categories",
			{
				p_bookmark_id: bookmarkId,
				p_category_ids: categoryIds,
			},
		);

		if (rpcError) {
			return apiError({
				route,
				message: "Failed to set bookmark categories",
				error: rpcError,
				operation: "set_bookmark_categories_rpc",
				userId,
				extra: { bookmarkId, categoryIds },
			});
		}

		console.log(`[${route}] Categories set successfully:`, {
			bookmarkId,
			categoryIds,
			insertedCount: insertedData.length,
		});

		// Trigger revalidation for all affected public categories (old + new)
		// This ensures public category pages update when bookmarks are added/removed
		const allAffectedCategoryIds = [
			...new Set([
				...categoryIds.filter((id) => id !== UNCATEGORIZED_CATEGORY_ID),
				...existingCategoryIds,
			]),
		];

		if (allAffectedCategoryIds.length > 0) {
			void revalidateCategoriesIfPublic(allAffectedCategoryIds, {
				operation: "set_bookmark_categories",
				userId,
			});
		}

		return insertedData;
	},
});
