import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";

import {
	type AddCategoryToBookmarkApiPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
	message: string | null;
};

// Helper function to update category ID for the bookmark
const updateCategoryIdLogic = async (
	supabase: SupabaseClient,
	bookmarkId: number,
	categoryId: number | null,
	updateAccess: boolean,
	userId: string,
	response: NextApiResponse<Data>,
): Promise<void> => {
	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ category_id: updateAccess ? categoryId : null })
			.match({ id: bookmarkId, user_id: userId })
			.select();

	if (error || isNull(data)) {
		console.error("[add-category-to-bookmark] Error updating category:", {
			error,
			bookmarkId,
			categoryId,
			userId,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "update_bookmark_category",
				userId,
			},
			extra: {
				bookmarkId,
				categoryId,
				updateAccess,
			},
		});
		response.status(500).json({
			data: null,
			error: "Failed to update bookmark category",
			message: null,
		});
		return;
	}

	console.log("[add-category-to-bookmark] Category updated successfully:", {
		bookmarkId,
		categoryId: updateAccess ? categoryId : null,
	});
	response.status(200).json({
		data,
		error: null,
		message: updateAccess ? null : ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	});
};

/**
 * Adds a category to a bookmark
 * Updates category based on the user's access role for the category
 */
export default async function handler(
	request: NextApiRequest<AddCategoryToBookmarkApiPayload>,
	response: NextApiResponse<Data>,
): Promise<void> {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;
		const email = userData?.user?.email;

		if (userError || !userId) {
			console.warn("[add-category-to-bookmark] User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				data: null,
				error: "Unauthorized",
				message: null,
			});
			return;
		}

		// Extract request data
		const {
			update_access: updateAccess,
			category_id: categoryId,
			bookmark_id: bookmarkId,
		} = request.body;

		// Entry point log
		console.log("[add-category-to-bookmark] API called:", {
			userId,
			bookmarkId,
			categoryId,
			updateAccess,
		});

		// Check if the bookmark was created by the user
		const { data: bookmarkData, error: bookmarkError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select(`user_id`)
			.eq("id", bookmarkId);

		if (bookmarkError) {
			console.error(
				"[add-category-to-bookmark] Error fetching bookmark data:",
				{
					error: bookmarkError,
					bookmarkId,
				},
			);
			Sentry.captureException(bookmarkError, {
				tags: {
					operation: "fetch_bookmark_data",
					userId,
				},
				extra: {
					bookmarkId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to fetch bookmark data",
				message: bookmarkError?.message || null,
			});
			return;
		}

		if (isEmpty(bookmarkData)) {
			console.warn("[add-category-to-bookmark] Bookmark not found:", {
				bookmarkId,
			});
			response.status(404).json({
				data: null,
				error: "Bookmark not found",
				message: null,
			});
			return;
		}

		// Verify bookmark ownership
		if (bookmarkData?.[0]?.user_id !== userId) {
			console.warn("[add-category-to-bookmark] User is not bookmark owner:", {
				userId,
				bookmarkId,
				bookmarkOwnerId: bookmarkData?.[0]?.user_id,
			});
			response.status(403).json({
				data: null,
				error: "You are not the bookmark owner",
				message: null,
			});
			return;
		}

		console.log("[add-category-to-bookmark] Bookmark ownership verified");

		// Get category data
		const { data: categoryData, error: categoryError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(`user_id`)
			.eq("id", categoryId);

		if (categoryError) {
			console.error(
				"[add-category-to-bookmark] Error fetching category data:",
				{
					error: categoryError,
					categoryId,
				},
			);
			Sentry.captureException(categoryError, {
				tags: {
					operation: "fetch_category_data",
					userId,
				},
				extra: {
					categoryId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to fetch category data",
				message: categoryError?.message || null,
			});
			return;
		}

		if (isEmpty(categoryData)) {
			console.warn("[add-category-to-bookmark] Category not found:", {
				categoryId,
			});
			response.status(404).json({
				data: null,
				error: "Category not found",
				message: null,
			});
			return;
		}

		const categoryUserId = categoryData?.[0]?.user_id;

		// Check if user is the category owner or if it's uncategorized (0)
		if (categoryUserId === userId || categoryId === 0) {
			console.log(
				"[add-category-to-bookmark] User is category owner or moving to uncategorized",
			);
			await updateCategoryIdLogic(
				supabase,
				bookmarkId,
				categoryId,
				updateAccess,
				userId,
				response,
			);
			return;
		}

		console.log(
			"[add-category-to-bookmark] User is not category owner, checking collaboration access:",
			{
				userId,
				categoryId,
				categoryOwnerId: categoryUserId,
			},
		);

		// Check if user is a collaborator with edit access
		const { data: sharedCategoryData, error: sharedCategoryError } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select(`edit_access`)
				.eq("category_id", categoryId)
				.eq("email", email);

		if (sharedCategoryError) {
			console.error(
				"[add-category-to-bookmark] Error fetching shared category data:",
				{
					error: sharedCategoryError,
					categoryId,
					email,
				},
			);
			Sentry.captureException(sharedCategoryError, {
				tags: {
					operation: "fetch_shared_category_data",
					userId,
				},
				extra: {
					categoryId,
					email,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to fetch collaboration data",
				message: sharedCategoryError?.message || null,
			});
			return;
		}

		if (isEmpty(sharedCategoryData)) {
			console.warn(
				"[add-category-to-bookmark] User is not owner or collaborator:",
				{
					userId,
					categoryId,
				},
			);
			response.status(403).json({
				data: null,
				error: "You are not the owner of this category",
				message: null,
			});
			return;
		}

		if (!sharedCategoryData[0]?.edit_access) {
			console.warn(
				"[add-category-to-bookmark] User does not have edit access:",
				{
					userId,
					categoryId,
					email,
				},
			);
			response.status(403).json({
				data: null,
				error: "You do not have edit access to this category",
				message: null,
			});
			return;
		}

		console.log(
			"[add-category-to-bookmark] User has edit access as collaborator",
		);
		await updateCategoryIdLogic(
			supabase,
			bookmarkId,
			categoryId,
			updateAccess,
			userId,
			response,
		);
	} catch (error) {
		console.error("[add-category-to-bookmark] Unexpected error:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "add_category_to_bookmark_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
			message: null,
		});
	}
}
