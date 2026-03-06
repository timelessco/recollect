import * as Sentry from "@sentry/nextjs";

import {
	AddCategoryToBookmarksPayloadSchema,
	AddCategoryToBookmarksResponseSchema,
	type AddCategoryToBookmarksResponse,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "add-category-to-bookmarks";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: AddCategoryToBookmarksPayloadSchema,
	outputSchema: AddCategoryToBookmarksResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_ids: bookmarkIds, category_id: categoryId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkIds,
			categoryId,
			count: bookmarkIds.length,
		});

		// 1. Verify ALL bookmarks are owned by user (batch check)
		const { data: ownedBookmarks, error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("id")
			.in("id", bookmarkIds)
			.eq("user_id", userId);

		if (bookmarkError) {
			return apiError({
				route,
				message: "Failed to verify bookmark ownership",
				error: bookmarkError,
				operation: "fetch_bookmarks",
				userId,
				extra: { bookmarkIds },
			});
		}

		const ownedIds = new Set(ownedBookmarks?.map((b) => b.id));
		const notOwnedIds = bookmarkIds.filter((id) => !ownedIds.has(id));

		if (notOwnedIds.length > 0) {
			return apiWarn({
				route,
				message: `${notOwnedIds.length} bookmark(s) not found or not owned by user`,
				status: 403,
				context: { notOwnedIds },
			});
		}

		console.log(`[${route}] All ${bookmarkIds.length} bookmarks verified`);

		// 2. Verify category access (skip for uncategorized = 0)
		if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
			const { data: categoryData, error: categoryError } = await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select("user_id")
				.eq("id", categoryId)
				.single();

			if (categoryError) {
				if (categoryError.code === "PGRST116") {
					return apiWarn({
						route,
						message: "Category not found",
						status: 404,
						context: { categoryId },
					});
				}

				return apiError({
					route,
					message: "Failed to fetch category",
					error: categoryError,
					operation: "fetch_category",
					userId,
					extra: { categoryId },
				});
			}

			// Check if user owns the category
			if (categoryData.user_id !== userId) {
				// Check if user is a collaborator with edit access
				const email = user.email;
				if (!email) {
					return apiWarn({
						route,
						message: "No access to this category",
						status: 403,
						context: { userId, categoryId },
					});
				}

				const { data: sharedData, error: sharedError } = await supabase
					.from(SHARED_CATEGORIES_TABLE_NAME)
					.select("edit_access")
					.eq("category_id", categoryId)
					.eq("email", email)
					.single();

				if (sharedError && sharedError.code !== "PGRST116") {
					return apiError({
						route,
						message: "Failed to check shared access",
						error: sharedError,
						operation: "fetch_shared",
						userId,
						extra: { categoryId, email },
					});
				}

				if (!sharedData?.edit_access) {
					return apiWarn({
						route,
						message: "No edit access to this category",
						status: 403,
						context: { userId, categoryId },
					});
				}

				console.log(`[${route}] User has edit access as collaborator`);
			} else {
				console.log(`[${route}] User is category owner`);
			}
		} else {
			console.log(
				`[${route}] Adding to uncategorized (category_id=${UNCATEGORIZED_CATEGORY_ID})`,
			);
		}

		// 3. Call RPC for atomic bulk insert
		// RPC returns out_bookmark_id/out_category_id (prefixed to avoid SQL ambiguity)
		const { data: insertedData, error: insertError } = await supabase.rpc(
			"add_category_to_bookmarks",
			{
				p_bookmark_ids: bookmarkIds,
				p_category_id: categoryId,
			},
		);

		if (insertError) {
			return apiError({
				route,
				message: "Failed to add category to bookmarks",
				error: insertError,
				operation: "rpc_add_category_to_bookmarks",
				userId,
				extra: { bookmarkIds, categoryId },
			});
		}

		// Transform RPC response to match API schema
		const transformedData: AddCategoryToBookmarksResponse = (
			insertedData ?? []
		).map((row) => ({
			bookmark_id: row.out_bookmark_id,
			category_id: row.out_category_id,
		}));

		console.log(
			`[${route}] Category added to ${transformedData.length} bookmarks (${bookmarkIds.length - transformedData.length} already had it)`,
		);

		// Trigger revalidation if category is public (non-blocking)
		// Don't await - failed revalidation shouldn't fail the mutation
		if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
			console.log(`[${route}] Initiating revalidation:`, {
				categoryId,
				userId,
			});

			void revalidateCategoryIfPublic(categoryId, {
				operation: "add_category_to_bookmarks",
				userId,
				// eslint-disable-next-line promise/prefer-await-to-then
			}).catch((error) => {
				console.error(`[${route}] Revalidation failed:`, {
					error,
					errorMessage:
						error instanceof Error
							? error.message
							: "revalidation failed in add-category-to-bookmarks",
					errorStack: error instanceof Error ? error.stack : undefined,
					categoryId,
					userId,
				});
				Sentry.captureException(error, {
					tags: { route: ROUTE },
					extra: { categoryId, userId, operation: "revalidation" },
				});
			});
		}

		return transformedData;
	},
});
