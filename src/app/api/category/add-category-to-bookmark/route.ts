import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidateCategoryIfPublic } from "@/lib/revalidation-helpers";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "add-category-to-bookmark";

const AddCategoryToBookmarkPayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" }),
	category_id: z
		.int({ error: "Collection ID must be a whole number" })
		.min(0, { error: "Collection ID must be non-negative" }),
});

export type AddCategoryToBookmarkPayload = z.infer<
	typeof AddCategoryToBookmarkPayloadSchema
>;

const AddCategoryToBookmarkResponseSchema = z.array(
	z.object({
		bookmark_id: z.number(),
		category_id: z.number(),
	}),
);

export type AddCategoryToBookmarkResponse = z.infer<
	typeof AddCategoryToBookmarkResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: AddCategoryToBookmarkPayloadSchema,
	outputSchema: AddCategoryToBookmarkResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_id: bookmarkId, category_id: categoryId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkId,
			categoryId,
		});

		// 1. Verify bookmark ownership + category ownership in parallel
		const [bookmarkResult, categoryResult] = await Promise.all([
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id")
				.eq("id", bookmarkId)
				.eq("user_id", userId)
				.single(),
			categoryId !== UNCATEGORIZED_CATEGORY_ID
				? supabase
						.from(CATEGORIES_TABLE_NAME)
						.select("user_id")
						.eq("id", categoryId)
						.single()
				: Promise.resolve({ data: null, error: null }),
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

		console.log(`[${route}] Bookmark exists and user owns it`);

		// 2. Verify category access (skip for uncategorized = 0)
		if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
			if (categoryResult.error) {
				if (categoryResult.error.code === "PGRST116") {
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
					error: categoryResult.error,
					operation: "fetch_category",
					userId,
					extra: { categoryId },
				});
			}

			// Check if user owns the category
			if (categoryResult.data?.user_id !== userId) {
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
						message: "Failed to fetch shared category",
						error: sharedError,
						operation: "fetch_shared_category",
						userId,
						extra: { categoryId, email },
					});
				}

				if (!sharedData?.edit_access) {
					return apiWarn({
						route,
						message: "No edit access to this category",
						status: 403,
						context: {
							userId,
							categoryId,
							hasSharedAccess: Boolean(sharedData),
							editAccess: sharedData?.edit_access,
						},
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

		// 3. Call bulk RPC with single-element array
		// RPC handles exclusive model logic (removing category 0 when adding real categories)
		// RPC returns out_bookmark_id/out_category_id (prefixed to avoid SQL ambiguity)
		const { data: insertedData, error: insertError } = await supabase.rpc(
			"add_category_to_bookmarks",
			{
				p_bookmark_ids: [bookmarkId],
				p_category_id: categoryId,
			},
		);

		if (insertError) {
			return apiError({
				route,
				message: "Failed to add category to bookmark",
				error: insertError,
				operation: "rpc_add_category_to_bookmarks",
				userId,
				extra: { bookmarkId, categoryId },
			});
		}

		const transformedData: AddCategoryToBookmarkResponse = insertedData.map(
			(row) => ({
				bookmark_id: row.out_bookmark_id,
				category_id: row.out_category_id,
			}),
		);

		console.log(`[${route}] Category added successfully:`, {
			bookmarkId,
			categoryId,
			isNewEntry: transformedData.length > 0,
		});

		// Trigger revalidation if category is public
		if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
			await revalidateCategoryIfPublic(categoryId, {
				operation: "add_category_to_bookmark",
				userId,
			});
		}

		return transformedData;
	},
});
