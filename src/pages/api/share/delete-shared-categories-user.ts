// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type DeleteSharedCategoriesUserApiPayload,
	type FetchSharedCategoriesData,
	type NextApiRequest,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

type DataResponse = FetchSharedCategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 *
 * Deletes a collaborator in a category
 */

export default async function handler(
	request: NextApiRequest<DeleteSharedCategoriesUserApiPayload>,
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
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.delete()
			.match({ id: request.body.id })
			.select();

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
