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
} from "../../../types/apiTypes";
import { CATEGORIES_TABLE_NAME, PROFILES } from "../../../utils/constants";

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | string | { message: string } | null;
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

	const { data, error }: PostgrestResponse<CategoriesData> = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.delete()
		.match({ id: request.body.category_id })
		.select();

	if (
		data &&
		!isEmpty(data) &&
		!isNull(request.body.category_order) &&
		request.body.category_order
	) {
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
