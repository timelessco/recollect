// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateCategoryApiPayload,
} from "../../../types/apiTypes";
import { CATEGORIES_TABLE_NAME } from "../../../utils/constants";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates catagory for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateCategoryApiPayload>,
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

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.update(request.body.updateData)
			.match({ id: request.body.category_id })
			.select();

	if (!isNull(error)) {
		response.status(500).json({
			data: null,
			error: isEmpty(error) ? { message: "Something went wrong" } : error,
		});
		throw new Error("ERROR");
	} else if (isEmpty(data) || isNull(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		throw new Error("ERROR");
	} else {
		response.status(200).json({ data, error: null });
	}
}
