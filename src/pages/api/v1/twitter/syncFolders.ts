// Next.js API route: Create multiple categories

import { type NextApiRequest, type NextApiResponse } from "next";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";
import slugify from "slugify";
import uniqid from "uniqid";

import { type CategoriesData } from "../../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
	PROFILES,
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

	// Get existing categories (case-insensitive: unique constraint is on LOWER(category_name))
	const categoryNames = categories
		.map((category: { name: string }) => category.name.trim())
		.filter(Boolean);
	const { data: existingCategories, error: existingCategoriesError } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("category_name")
			.eq("user_id", userId);

	if (existingCategoriesError) {
		console.error("[twitter/syncFolders] Error fetching existing categories:", {
			error: existingCategoriesError,
			userId,
		});
		response.status(500).json({
			data: null,
			error: existingCategoriesError,
		});
		return;
	}

	const existingCategoryNamesLower = new Set(
		(existingCategories ?? []).map((category) =>
			String(category.category_name).toLowerCase(),
		),
	);

	// Dedupe request by case-insensitive name (first occurrence wins)
	const seenLower = new Set<string>();
	const uniqueNames = categoryNames.filter((name: string) => {
		const key = name.toLowerCase();
		if (seenLower.has(key)) {
			return false;
		}

		seenLower.add(key);
		return true;
	});

	// Filter out categories that already exist
	const newCategoryNames = uniqueNames.filter(
		(name: string) => !existingCategoryNamesLower.has(name.toLowerCase()),
	);

	if (newCategoryNames.length === 0) {
		response.status(200).json({ data: [], error: null });
		return;
	}

	// Only insert new categories
	const rowsToInsert = newCategoryNames.map((category_name: string) => ({
		category_name,
		user_id: userId,
		category_slug: `${slugify(category_name, {
			lower: true,
		})}-${uniqid.time()}-twitter`,
		icon: "bookmark",
		icon_color: "#ffffff",
	}));

	const { data, error }: PostgrestResponse<CategoriesData> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.insert(rowsToInsert)
		.select();

	if (data && !isEmpty(data)) {
		const { data: profileData, error: profileError } = await supabase
			.from(PROFILES)
			.select("category_order")
			.eq("id", userId)
			.single();

		if (profileError) {
			response.status(500).json({ data: null, error: profileError });
			return;
		}

		const existingOrder = profileData?.category_order ?? [];

		const newIds = data.map((item) => item.id);

		const updatedOrder = [...existingOrder, ...newIds];

		const { error: orderError } = await supabase
			.from(PROFILES)
			.update({
				category_order: updatedOrder,
			})
			.eq("id", userId)
			.select("id, category_order")
			.single();

		if (orderError) {
			response.status(500).json({ data: null, error: orderError });
			throw new Error("Failed to update category order");
		}
	}

	if (!isNull(error)) {
		// Handle unique constraint violation (case-insensitive duplicate)
		// Postgres error code 23505 = unique_violation
		const isPostgrestError =
			error && typeof error === "object" && "code" in error;
		const errorMessage =
			isPostgrestError && "message" in error ? String(error.message) : "";
		if (
			(isPostgrestError && (error as PostgrestError).code === "23505") ||
			errorMessage.includes("unique_user_category_name_ci")
		) {
			console.warn(
				"Duplicate category name attempt (case-insensitive) in bulk insert:",
				{
					userId,
					categoryCount: categories.length,
				},
			);
			response.status(409).json({
				data: null,
				error: { message: DUPLICATE_CATEGORY_NAME_ERROR },
			});
			return;
		}

		response.status(500).json({ data: null, error });
		return;
	}

	response.status(200).json({ data, error: null });
}
