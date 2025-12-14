import { type NextRequest } from "next/server";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	apiError,
	apiSuccess,
	apiWarn,
	parseBody,
} from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";
import { isNullable } from "@/utils/assertion-utils";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
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

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const body = await parseBody({
			request,
			schema: RemoveCategoryFromBookmarkPayloadSchema,
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

		// Block removal of category 0 (permanent base category)
		if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
			return apiWarn({
				route: ROUTE,
				message: "Cannot remove the uncategorized category",
				status: 400,
				context: { bookmarkId, categoryId },
			});
		}

		// 1. Verify bookmark ownership
		const { data: bookmarkData, error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("user_id")
			.eq("id", bookmarkId)
			.single();

		if (bookmarkError) {
			if (bookmarkError.code === "PGRST116") {
				return apiWarn({
					route: ROUTE,
					message: "Bookmark not found",
					status: 404,
					context: { bookmarkId },
				});
			}

			return apiError({
				route: ROUTE,
				message: "Failed to fetch bookmark",
				error: bookmarkError,
				operation: "fetch_bookmark",
				userId,
				extra: { bookmarkId },
			});
		}

		const isBookmarkOwner = bookmarkData.user_id === userId;
		let hasEditAccess = isBookmarkOwner;

		// 2. If not bookmark owner, check shared category edit access
		const email = user.email;
		if (!isBookmarkOwner && email) {
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

			if (sharedData?.edit_access) {
				hasEditAccess = true;
				console.log(`[${ROUTE}] User has edit access as collaborator`);
			}
		}

		if (!hasEditAccess) {
			return apiWarn({
				route: ROUTE,
				message: "No permission to remove this category",
				status: 403,
				context: { userId, bookmarkId, categoryId, isBookmarkOwner },
			});
		}

		console.log(`[${ROUTE}] Permission verified`);

		// 3. Delete the bookmark_category entry
		// Category 0 is always present, so bookmark won't be orphaned
		const { data: deletedData, error: deleteError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.delete()
			.eq("bookmark_id", bookmarkId)
			.eq("category_id", categoryId)
			.select();

		if (deleteError) {
			return apiError({
				route: ROUTE,
				message: "Failed to remove category from bookmark",
				error: deleteError,
				operation: "delete_bookmark_category",
				userId,
				extra: { bookmarkId, categoryId },
			});
		}

		if (isEmpty(deletedData)) {
			return apiWarn({
				route: ROUTE,
				message: "Category association not found",
				status: 404,
				context: { bookmarkId, categoryId },
			});
		}

		console.log(`[${ROUTE}] Category removed successfully:`, {
			bookmarkId,
			categoryId,
		});

		return apiSuccess({
			route: ROUTE,
			data: deletedData,
			schema: RemoveCategoryFromBookmarkResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "remove_category_from_bookmark_unexpected",
		});
	}
}
