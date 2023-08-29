// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import {
	createClient,
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
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
	PROFILES,
} from "../../../utils/constants";

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | VerifyErrors | { message: string } | null;
};

/**
 * Creats catagory for a user
 */

export default async function handler(
	request: NextApiRequest<AddUserCategoryApiPayload>,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error) => {
			if (error) {
				response.status(500).json({ data: null, error });
				throw new Error("ERROR");
			}
		},
	);
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const { user_id: userId } = request.body;
	const { name } = request.body;

	// check if category name is already there for the user
	const { data: matchedCategoryName, error: matchedCategoryNameError } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(`category_name`)
			.eq("user_id", userId)
			.eq("category_name", name);

	if (!isNull(matchedCategoryNameError)) {
		response.status(500).json({ data: null, error: matchedCategoryNameError });
		throw new Error("ERROR");
	}

	if (isEmpty(matchedCategoryName)) {
		const { data, error }: PostgrestResponse<CategoriesData> = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert([
				{
					category_name: name,
					user_id: userId,
					category_slug: `${slugify(name, { lower: true })}-${uniqid.time()}`,
				},
			])
			.select();

		if (
			data &&
			!isEmpty(data) &&
			// !isNull(req.body.category_order) &&
			request.body.category_order !== undefined
		) {
			const order = !isNull(request.body.category_order)
				? request.body.category_order
				: [];
			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({
					category_order: [...order, data[0]?.id],
				})
				.match({ id: userId }).select(`
      id, category_order`);

			if (!isNull(orderError)) {
				response.status(500).json({ data: null, error: orderError });
				throw new Error("ERROR");
			}
		}

		if (!isNull(error)) {
			response.status(500).json({ data: null, error });
			throw new Error("ERROR");
		} else {
			response.status(200).json({ data, error: null });
		}
	} else {
		response
			.status(500)
			.json({ data: null, error: { message: DUPLICATE_CATEGORY_NAME_ERROR } });
	}
}
