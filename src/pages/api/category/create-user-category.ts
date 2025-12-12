// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";
import slugify from "slugify";
import uniqid from "uniqid";

import {
	type AddUserCategoryApiPayload,
	type CategoriesData,
	type NextApiRequest,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
	PROFILES,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	getApiSupabaseUser,
} from "../../../utils/supabaseServerClient";

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | VerifyErrors | { message: string } | null;
};

/**
 * Creates category for a user
 */
export default async function handler(
	request: NextApiRequest<AddUserCategoryApiPayload>,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Check for auth errors
		const { data: userData, error: userError } = await getApiSupabaseUser(
			request,
			supabase,
		);
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				data: null,
				error: { message: "Unauthorized" },
			});
			return;
		}

		const rawName = request.body?.name;
		const trimmedName =
			typeof rawName === "string" ? rawName.trim() : ("" as string);

		if (
			typeof rawName !== "string" ||
			trimmedName.length < MIN_TAG_COLLECTION_NAME_LENGTH ||
			trimmedName.length > MAX_TAG_COLLECTION_NAME_LENGTH
		) {
			response.status(400).json({
				data: null,
				error: {
					message: `Collection name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
				},
			});
			return;
		}

		console.log("create-user-category API called:", { userId, name: rawName });

		// check if category name is already there for the user
		const { data: matchedCategoryName, error: matchedCategoryNameError } =
			await supabase
				.from(CATEGORIES_TABLE_NAME)
				.select(`category_name`)
				.eq("user_id", userId)
				.eq("category_name", trimmedName);

		console.log("Existing category check result:", {
			matchedCategoryName,
			hasMatch: !isEmpty(matchedCategoryName),
		});

		if (!isNull(matchedCategoryNameError)) {
			console.error(
				"Error checking existing category name:",
				matchedCategoryNameError,
			);
			Sentry.captureException(matchedCategoryNameError, {
				tags: {
					operation: "check_existing_category",
					userId,
				},
				extra: { categoryName: trimmedName },
			});
			response.status(500).json({
				data: null,
				error: { message: "Error checking existing category" },
			});
			return;
		}

		// Check for duplicate category name
		if (!isEmpty(matchedCategoryName)) {
			console.warn("Duplicate category name attempt:", {
				categoryName: trimmedName,
			});
			response.status(500).json({
				data: null,
				error: { message: DUPLICATE_CATEGORY_NAME_ERROR },
			});
			return;
		}

		// Insert category
		const { data, error }: PostgrestResponse<CategoriesData> = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert([
				{
					category_name: trimmedName,
					user_id: userId,
					category_slug: `${slugify(trimmedName, { lower: true })}-${uniqid.time()}`,
				},
			])
			.select();

		if (error) {
			console.error("Error inserting category:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "insert_category",
					userId,
					categoryName: trimmedName,
				},
			});
			response.status(500).json({
				data: null,
				error: { message: "Error creating category" },
			});
			return;
		}

		// Check if data was returned
		if (!data || isEmpty(data)) {
			console.warn(
				"No data returned from the database while creating category:",
				{ data },
			);
			response.status(500).json({
				data: null,
				error: {
					message: "No data returned from the database while creating category",
				},
			});
			return;
		}

		console.log("Category insert result:", {
			categoryId: data[0]?.id,
			categorySlug: data[0]?.category_slug,
		});

		// Update category order if provided
		const { category_order } = request.body;
		if (category_order !== undefined) {
			const order = !isNull(category_order) ? category_order : [];

			console.log("Updating category order:", {
				newCategoryId: data[0]?.id,
			});

			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({
					category_order: [...order, data[0]?.id],
				})
				.match({ id: userId }).select(`
      id, category_order`);

			if (orderError) {
				console.error("Error updating category order:", orderError);
				Sentry.captureException(orderError, {
					tags: {
						operation: "update_category_order",
						userId,
					},
					extra: { categoryId: data[0]?.id },
				});
				response.status(500).json({
					data: null,
					error: { message: "Error updating category order" },
				});
				return;
			}
		}

		// Success
		console.log("Category created successfully:", {
			categoryId: data[0]?.id,
		});
		response.status(200).json({ data, error: null });
	} catch (error) {
		console.error("Unexpected error in create-user-category:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "create_user_category_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: { message: "An unexpected error occurred" },
		});
	}
}
