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
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	// check if category name is already there for the user, along with the category id
	const { data: matchedCategoryName, error: matchedCategoryNameError } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(`category_name`)
			.eq("user_id", userId)
			.eq("category_name", request?.body?.updateData?.category_name)
			.neq("id", request.body.category_id);

	if (!isNull(matchedCategoryNameError)) {
		Sentry.captureException(matchedCategoryNameError);
		response.status(500).json({
			data: null,
			error: { message: "Database error while checking category name" },
		});
		return;
	}

	if (matchedCategoryName && matchedCategoryName.length > 0) {
		Sentry.captureException("Category name already exists");
		response
			.status(409)
			.json({ data: null, error: { message: "Category name already exists" } });
		return;
	}

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.update(request.body.updateData)
			.match({ id: request.body.category_id, user_id: userId })
			.select();

	if (!isNull(error)) {
		response.status(500).json({
			data: null,
			error: isEmpty(error) ? { message: "Something went wrong" } : error,
		});
		Sentry.captureException(`ERROR: Update DB error: ${error}`);
	} else if (isEmpty(data) || isNull(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		Sentry.captureException(`Error: DB data is empty`);
	} else {
		response.status(200).json({ data, error: null });
	}
}
