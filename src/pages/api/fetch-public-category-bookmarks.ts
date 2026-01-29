// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import isNull from "lodash/isNull";
import omit from "lodash/omit";

import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type GetPublicCategoryBookmarksApiResponseType,
	type ProfilesTableTypes,
} from "../../types/apiTypes";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
} from "../../utils/constants";
import { createServiceClient } from "../../utils/supabaseClient";

/**
 * gets bookmarks in a public category with pagination support
 */

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<GetPublicCategoryBookmarksApiResponseType>,
) {
	const supabase = createServiceClient();

	// Parse pagination parameters
	const page = Number(request.query.page ?? 0);
	const limit = Number(request.query.limit ?? PAGINATION_LIMIT);

	// get category data
	const { data: categoryData, error: categoryError } = (await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
			id,
      user_id (
        email,
				user_name
      ),
			category_views,
			icon,
			icon_color,
			category_name,
			is_public
    `,
		)
		.eq("category_slug", request.query.category_slug)) as unknown as {
		data: Array<{
			category_name: CategoriesData["category_name"];
			category_views: BookmarkViewDataTypes;
			icon: CategoriesData["icon"];
			icon_color: CategoriesData["icon_color"];
			id: CategoriesData["id"];
			is_public: CategoriesData["is_public"];
			user_id: {
				email: ProfilesTableTypes["email"];
				user_name: ProfilesTableTypes["user_name"];
			};
		}>;
		error: PostgrestError;
	};

	if (categoryData[0]?.user_id?.user_name !== request.query.user_name) {
		// this is to check if we change user name in url then this page should show 404
		// status is 200 as DB is not giving any error
		response.status(200).json({
			data: null,
			error: "username mismatch from url query",
			category_views: null,
			icon: null,
			icon_color: null,
			category_name: null,
			is_public: null,
		});

		console.log("username mismatch from url query");
	} else {
		const sortBy = categoryData[0]?.category_views?.sortBy;
		const categoryId = categoryData[0]?.id;

		if (!categoryId) {
			response.status(404).json({
				data: null,
				error: "category not found",
				category_views: null,
				icon: null,
				icon_color: null,
				category_name: null,
				is_public: null,
			});
			return;
		}

		// Query through junction table for many-to-many relationship
		let query = supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
				*,
				${BOOKMARK_CATEGORIES_TABLE_NAME}!inner (
					category_id (
						id,
						category_name,
						category_slug,
						is_public,
						icon,
						icon_color
					)
				),
				user_id!inner (*)
			`,
			)
			.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, categoryId)
			.is("trash", null);

		if (sortBy === "date-sort-acending") {
			query = query.order("id", { ascending: false });
		}

		if (sortBy === "date-sort-decending") {
			query = query.order("id", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-acending") {
			query = query.order("title", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-decending") {
			query = query.order("title", { ascending: false });
		}

		// Apply pagination
		const from = page * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data: rawData, error } = await query;

		// Remove junction table field from response (not needed in frontend)
		const data = (rawData as Array<Record<string, unknown>>)?.map((item) =>
			omit(item, [BOOKMARK_CATEGORIES_TABLE_NAME]),
		) as GetPublicCategoryBookmarksApiResponseType["data"];

		if (!isNull(error) || !isNull(categoryError)) {
			response.status(500).json({
				data: null,
				error,
				category_views: null,
				icon: null,
				icon_color: null,
				category_name: null,
				is_public: null,
			});
			throw new Error("ERROR: get public category bookmark error");
		} else {
			response.status(200).json({
				data,
				error: null,
				category_views: categoryData[0]?.category_views,
				icon: categoryData[0]?.icon,
				icon_color: categoryData[0]?.icon_color,
				category_name: categoryData[0]?.category_name,
				is_public: categoryData[0]?.is_public,
			});
		}
	}
}
