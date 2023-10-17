// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateUserProfileApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates profile for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateUserProfileApiPayload>,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(PROFILES)
			.update(request.body.updateData)
			.match({ id: request.body.id })
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
