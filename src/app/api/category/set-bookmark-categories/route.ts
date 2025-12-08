import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess, apiWarn, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/supabase/api";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "set-bookmark-categories";

const SetBookmarkCategoriesSchema = z.object({
	bookmark_id: z
		.number()
		.int()
		.positive("Bookmark ID must be a positive integer"),
	category_ids: z
		.array(z.number().int().min(0, "Category ID must be non-negative"))
		.min(1, "At least one category ID is required")
		.max(100, "Cannot add more than 100 categories to a bookmark")
		.refine(
			(ids) => new Set(ids).size === ids.length,
			"Duplicate category IDs not allowed",
		),
});

const BookmarkCategoryOutputSchema = z.array(
	z.object({
		bookmark_id: z.number(),
		category_id: z.number(),
	}),
);

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const body = await parseBody({
			request,
			schema: SetBookmarkCategoriesSchema,
			route: ROUTE,
		});
		if (body.errorResponse) {
			return body.errorResponse;
		}

		const { supabase, user } = auth;
		const { bookmark_id: bookmarkId, category_ids: categoryIds } = body.data;
		const userId = user.id;

		console.log(`[${ROUTE}] API called:`, {
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
					route: ROUTE,
					message: "Bookmark not found or not owned by user",
					status: 404,
					context: { bookmarkId },
				});
			}

			return apiError({
				route: ROUTE,
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
					route: ROUTE,
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
						route: ROUTE,
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
						route: ROUTE,
						message: `No access to categories: ${unauthorizedCategoryIds.join(", ")}`,
						status: 403,
						context: { userId, unauthorizedCategoryIds },
					});
				}
			} else if (notOwnedCategoryIds.length > 0) {
				return apiWarn({
					route: ROUTE,
					message: `No access to categories: ${notOwnedCategoryIds.join(", ")}`,
					status: 403,
					context: { userId, notOwnedCategoryIds },
				});
			}
		}

		console.log(`[${ROUTE}] Category access verified`);

		// 3. Atomically replace bookmark categories via RPC
		const { data: insertedData, error: rpcError } = await supabase.rpc(
			"set_bookmark_categories",
			{
				p_bookmark_id: bookmarkId,
				p_category_ids: categoryIds,
			},
		);

		if (rpcError) {
			return apiError({
				route: ROUTE,
				message: "Failed to set bookmark categories",
				error: rpcError,
				operation: "set_bookmark_categories_rpc",
				userId,
				extra: { bookmarkId, categoryIds },
			});
		}

		console.log(`[${ROUTE}] Categories set successfully:`, {
			bookmarkId,
			categoryIds,
			insertedCount: insertedData.length,
		});

		return apiSuccess({
			route: ROUTE,
			data: insertedData,
			schema: BookmarkCategoryOutputSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "set_bookmark_categories_unexpected",
		});
	}
}
