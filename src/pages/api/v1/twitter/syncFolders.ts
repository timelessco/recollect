// Next.js API route: Create multiple categories

import { type NextApiRequest, type NextApiResponse } from "next";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";
import slugify from "slugify";
import uniqid from "uniqid";

import { type CategoriesData } from "../../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
} from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | VerifyErrors | { message: string } | null;
};

/**
 * Creates multiple categories for a user
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	if (request.method !== "POST") {
		response.status(405).json({
			data: null,
			error: { message: "Method not allowed" },
		});
		return;
	}

	const supabase = apiSupabaseClient(request, response);
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;
	const { categories } = request.body;

	if (!categories || categories.length === 0) {
		response.status(400).json({
			data: null,
			error: { message: "No categories provided" },
		});
		return;
	}

	// 1. Check for duplicates
	const { data: existing, error: existingError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("category_name")
		.eq("user_id", userId)
		.in("category_name", categories);

	if (!isNull(existingError)) {
		response.status(500).json({ data: null, error: existingError });
		return;
	}

	if (existing && existing.length > 0) {
		response.status(400).json({
			data: null,
			error: { message: DUPLICATE_CATEGORY_NAME_ERROR },
		});
		return;
	}

	// 2. Insert all categories
	const rowsToInsert = categories.map((category: { name: string }) => ({
		category_name: category.name,
		user_id: userId,
		category_slug: `${slugify(category.name, {
			lower: true,
		})}-${uniqid.time()}`,
		icon: "bookmark",
		icon_color: "#ffffff",
	}));

	const { data, error }: PostgrestResponse<CategoriesData> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.insert(rowsToInsert)
		.select();

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		return;
	}

	response.status(200).json({ data, error: null });
}
