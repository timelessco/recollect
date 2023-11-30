// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	type NextApiRequest,
	type UserTagsData,
} from "../../../types/apiTypes";
import { TAG_TABLE_NAME } from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// creats tags for a specific user

export default async function handler(
	request: NextApiRequest<{
		name: string;
		user_id: string;
	}>,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const userId = request.body.user_id;
	const { name } = request.body;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(TAG_TABLE_NAME)
			.insert([
				{
					name,
					user_id: userId,
				},
			])
			.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
