// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateCategoryApiPayload,
} from "../../../types/apiTypes";
import { CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates category for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateCategoryApiPayload>,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({ data: null, error: "Unauthorized" });
			return;
		}

		// Entry point log
		console.log("update-user-category API called:", {
			userId,
			categoryId: request.body.category_id,
			categoryName: request.body.updateData?.category_name,
		});

		// check if category name is already there for the user, along with the category id
		const { data: matchedCategoryName, error: matchedCategoryNameError } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select(`category_name`)
				.eq("user_id", userId)
				.eq("category_name", request?.body?.updateData?.category_name)
				.neq("id", request.body.category_id);

		if (!isNull(matchedCategoryNameError)) {
			console.error(
				"Database error while checking category name:",
				matchedCategoryNameError,
			);
			Sentry.captureException(matchedCategoryNameError, {
				tags: {
					operation: "check_duplicate_category",
					userId,
				},
			});
			response.status(500).json({
				data: null,
				error: { message: "Database error while checking category name" },
			});
			return;
		}

		if (matchedCategoryName && matchedCategoryName.length > 0) {
			console.warn("Duplicate category name attempt:", {
				categoryName: request.body.updateData?.category_name,
				userId,
			});
			response
				.status(409)
				.json({
					data: null,
					error: { message: "Category name already exists" },
				});
			return;
		}

		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.update(request.body.updateData)
				.match({ id: request.body.category_id, user_id: userId })
				.select();

		if (!isNull(error)) {
			console.error("Error updating category:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "update_category",
					userId,
				},
				extra: {
					categoryId: request.body.category_id,
					updateData: request.body.updateData,
				},
			});
			response.status(500).json({
				data: null,
				error: isEmpty(error) ? { message: "Something went wrong" } : error,
			});
			return;
		}

		if (isEmpty(data) || isNull(data)) {
			console.error("Database returned empty data after update");
			Sentry.captureException(new Error("DB data is empty after update"), {
				tags: {
					operation: "update_category",
					userId,
				},
				extra: {
					categoryId: request.body.category_id,
				},
			});
			response
				.status(500)
				.json({ data: null, error: { message: "Something went wrong" } });
			return;
		}

		console.log("Category updated successfully:", {
			categoryId: data[0]?.id,
			categoryName: data[0]?.category_name,
		});
		response.status(200).json({ data, error: null });
	} catch (error) {
		console.error("Unexpected error in update-user-category:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "update_user_category_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: { message: "An unexpected error occurred" },
		});
	}
}
