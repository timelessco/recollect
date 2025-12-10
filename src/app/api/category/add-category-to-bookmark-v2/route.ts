import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess, apiWarn, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/supabase/api";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

const ROUTE = "add-category-to-bookmark-v2";

const AddCategoryToBookmarkV2PayloadSchema = z.object({
	bookmark_id: z
		.number()
		.int()
		.positive("Bookmark ID must be a positive integer"),
	category_id: z.number().int().min(0, "Category ID must be non-negative"),
});

export type AddCategoryToBookmarkV2Payload = z.infer<
	typeof AddCategoryToBookmarkV2PayloadSchema
>;

const AddCategoryToBookmarkV2ResponseSchema = z.array(
	z.object({
		bookmark_id: z.number(),
		category_id: z.number(),
	}),
);

export type AddCategoryToBookmarkV2Response = z.infer<
	typeof AddCategoryToBookmarkV2ResponseSchema
>;

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const body = await parseBody({
			request,
			schema: AddCategoryToBookmarkV2PayloadSchema,
			route: ROUTE,
		});
		if (body.errorResponse) {
			return body.errorResponse;
		}

		const { supabase, user } = auth;
		const { bookmark_id: bookmarkId, category_id: categoryId } = body.data;
		const userId = user.id;

		console.log(`[${ROUTE}] API called:`, {
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

		console.log(`[${ROUTE}] Bookmark exists and user owns it`);

		// 2. Verify category access (skip for uncategorized = 0)
		if (categoryId !== UNCATEGORIZED_CATEGORY_ID) {
			if (categoryResult.error) {
				if (categoryResult.error.code === "PGRST116") {
					return apiWarn({
						route: ROUTE,
						message: "Category not found",
						status: 404,
						context: { categoryId },
					});
				}

				return apiError({
					route: ROUTE,
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
						route: ROUTE,
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
						route: ROUTE,
						message: "Failed to fetch shared category",
						error: sharedError,
						operation: "fetch_shared_category",
						userId,
						extra: { categoryId, email },
					});
				}

				if (!sharedData?.edit_access) {
					return apiWarn({
						route: ROUTE,
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

				console.log(`[${ROUTE}] User has edit access as collaborator`);
			} else {
				console.log(`[${ROUTE}] User is category owner`);
			}
		} else {
			console.log(
				`[${ROUTE}] Adding to uncategorized (category_id=${UNCATEGORIZED_CATEGORY_ID})`,
			);
		}

		// 3. Insert into bookmark_categories (upsert to handle duplicates)
		const { data: insertedData, error: insertError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.upsert(
				{
					bookmark_id: bookmarkId,
					category_id: categoryId,
					user_id: userId,
				},
				{
					onConflict: "bookmark_id,category_id",
					ignoreDuplicates: true,
				},
			)
			.select();

		if (insertError) {
			return apiError({
				route: ROUTE,
				message: "Failed to add category to bookmark",
				error: insertError,
				operation: "insert_bookmark_category",
				userId,
				extra: { bookmarkId, categoryId },
			});
		}

		console.log(`[${ROUTE}] Category added successfully:`, {
			bookmarkId,
			categoryId,
			isNewEntry: insertedData && insertedData.length > 0,
		});

		return apiSuccess({
			route: ROUTE,
			data: insertedData,
			schema: AddCategoryToBookmarkV2ResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "add_category_to_bookmark_v2_unexpected",
		});
	}
}
