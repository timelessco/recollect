/* eslint-disable no-console */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import {
	createClient,
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { verify } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type DeleteUserCategoryApiPayload,
	type NextApiRequest,
	type ProfilesTableTypes,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";

type Data = {
	data: CategoriesData[] | null;
	error:
		| PostgrestError
		| string
		| { dbErrorMessage?: PostgrestError; message: string }
		| null;
};

/**
 * Deletes catagory for a user
 */

export default async function handler(
	request: NextApiRequest<DeleteUserCategoryApiPayload>,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ data: null, error: error_ });
				throw new Error("ERROR");
			}
		},
	);
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const tokenDecode: { sub: string } = jwtDecode(request.body.access_token);
	const userId = tokenDecode?.sub;

	const {
		data: categoryData,
		error: categoryDataError,
	}: PostgrestResponse<{ user_id: ProfilesTableTypes["id"] }> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(`user_id`)
		.eq("id", request.body.category_id);

	if (
		!isNull(categoryDataError) &&
		isEmpty(categoryData) &&
		isNull(categoryData)
	) {
		response.status(500).json({
			data: null,
			error: {
				message: `error in getting category data`,
				dbErrorMessage: categoryDataError,
			},
		});
		throw new Error("ERROR");
	}

	// deletes any the category in shared collabs table
	// when the category is deleted then all the collab users will also have the category deleted
	// but this should only happen if the owner deletes the category

	// this tells if the person deleting the category is the owner of the category
	const isDelTriggerUserTheOwner = !isNull(categoryData)
		? categoryData[0]?.user_id === userId
		: false;

	if (!isDelTriggerUserTheOwner) {
		response.status(500).json({
			data: null,
			error: {
				message: `Only collection owner can delete this collection`,
			},
		});
		throw new Error("ERROR");
	}

	// deleting all its associations in shared_category table
	const { data: sharedCategoryData, error: sharedCategoryError } =
		await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.delete()
			.match({ category_id: request.body.category_id });

	if (!isNull(sharedCategoryError)) {
		response.status(500).json({
			data: null,
			error: {
				message: `error on deleting associations in shared_category table`,
				dbErrorMessage: sharedCategoryError,
			},
		});
		throw new Error("ERROR");
	}

	if (
		isNull(sharedCategoryError) &&
		!isEmpty(sharedCategoryData) &&
		!isNull(sharedCategoryData)
	) {
		console.info(
			`have deleted this category_id in shared_category table: `,
			request.body.category_id,
		);
	}

	console.info(`111111111111111111111111111111111111111`);

	// if bookmarks from the del category is in trash
	// then we need to set the category id of the bookmark to uncategorized

	const { data: trashData, error: trashDataError } = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			category_id: 0,
		})
		.match({ category_id: request.body.category_id, trash: true })
		.select(`id`);

	if (!isNull(trashDataError)) {
		response.status(500).json({
			data: null,
			error: {
				message: `error on updating all trash bookmarks to uncategorized`,
				dbErrorMessage: trashDataError,
			},
		});
		throw new Error("ERROR");
	}

	if (!isEmpty(trashData)) {
		console.info(`Updated trash bookmarks to uncategorized`, trashData);
	}

	console.info(`22222222222222222222222222222222222`);

	const { data, error }: PostgrestResponse<CategoriesData> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.delete()
		.match({ id: request.body.category_id })
		.select(`*`);

	console.info(`333333333333333333333333333333333`, data, error);

	if (
		data &&
		!isEmpty(data) &&
		!isNull(request.body.category_order) &&
		request.body.category_order
	) {
		console.info("444444444444444444444444444444");
		// updates user category order
		const { error: orderError } = await supabase
			.from(PROFILES)
			.update({
				category_order: request.body.category_order?.filter(
					(item: number) => item !== data[0]?.id,
				),
			})
			.match({ id: userId }).select(`
      id, category_order`);

		console.info("5555555555555555555555555555", orderError);

		if (!isNull(orderError)) {
			response.status(500).json({ data: null, error: orderError });
			throw new Error("ERROR");
		}
	}

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	} else if (isEmpty(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		throw new Error("ERROR");
	} else {
		response.status(200).json({ data, error: null });
	}
}
