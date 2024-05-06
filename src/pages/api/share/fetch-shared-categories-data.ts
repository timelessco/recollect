// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches shared categories

type DataResponse = FetchSharedCategoriesData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;
type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	// TODO: only fetch the shared collections where the user email or id is matched with email / user_id columns , do not fetch all the rows

	const supabase = apiSupabaseClient(request, response);
	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase.from(SHARED_CATEGORIES_TABLE_NAME).select();
	// .eq('email', email); // TODO: check and remove

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
