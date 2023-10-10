// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import isNull from "lodash/isNull";

import {
	type NextApiRequest,
	type UpdateCategoryOrderApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

type responseType = {
	category_order: string[];
	id: string;
} | null;

type Data = {
	data: responseType;
	error: PostgrestError | string | { message: string } | null;
};

/**
 * Updates catagory order for a user
 */

export default async function handler(
	request: NextApiRequest<{
		category_order: Pick<UpdateCategoryOrderApiPayload, "order">;
	}>,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error) => {
			if (error) {
				response.status(500).json({ data: null, error });
				throw new Error("ERROR: token error");
			}
		},
	);
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const tokenDecode: { sub: string } = jwtDecode(request.body.access_token);
	const userId = tokenDecode?.sub;

	const { data: updateTargetCategoryData, error: updateTargetCategoryError } =
		(await supabase
			.from(PROFILES)
			.update({
				category_order: isNull(request.body.category_order)
					? []
					: request.body.category_order,
			})
			.match({ id: userId }).select(`
      id, category_order`)) as Data;

	if (!isNull(updateTargetCategoryError)) {
		response.status(500).json({
			data: null,
			error: updateTargetCategoryError,
		});
		throw new Error("ERROR");
	} else {
		response.status(200).json({ data: updateTargetCategoryData, error: null });
	}
}
