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

import { tagCategoryNameSchema } from "../../../lib/validation/tag-category-schema";
import {
	type AddUserCategoryApiPayload,
	type CategoriesData,
	type NextApiRequest,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
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

		const result = tagCategoryNameSchema.safeParse(request.body?.name);

		if (!result.success) {
			const errorMessage =
				result.error.issues[0]?.message ?? "Invalid collection name";
			const validationError = new Error(errorMessage);
			console.warn("[create-user-category] Validation failed:", {
				userId,
				name: request.body?.name,
				issues: result.error.issues,
			});
			Sentry.captureException(validationError, {
				tags: {
					operation: "validate_category_name",
					userId,
				},
				extra: {
					name: request.body?.name,
				},
			});
			response.status(400).json({
				data: null,
				error: { message: errorMessage },
			});
			return;
		}

		// Already trimmed by Zod
		const trimmedName = result.data;

		console.log("[create-user-category] API called:", {
			userId,
			name: trimmedName,
		});

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
			// Handle unique constraint violation (case-insensitive duplicate)
			// Postgres error code 23505 = unique_violation
			if (
				error.code === "23505" ||
				error.message?.includes("unique_user_category_name_ci")
			) {
				console.warn("Duplicate category name attempt (case-insensitive):", {
					categoryName: trimmedName,
					userId,
				});
				response.status(409).json({
					data: null,
					error: { message: DUPLICATE_CATEGORY_NAME_ERROR },
				});
				return;
			}

			console.error("[create-user-category] Error inserting category:", error);
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
