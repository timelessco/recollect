// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import { type UserTagsData } from "../../../types/apiTypes";
import { TAG_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches tags for a perticular user

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	if (!userId || isEmpty(userId)) {
		response.status(500).json({ data: null, error: "User id is missing" });
		return;
	}

	const { data, error } = (await supabase
		.from(TAG_TABLE_NAME)
		.select(`*`)
		.eq("user_id", userId)) as unknown as {
		data: DataResponse;
		error: ErrorResponse;
	};

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
	}
}
