// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	type AddTagToBookmarkApiPayload,
	type NextApiRequest,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARK_TAGS_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api adds tags to a bookmark

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest<{
		data: Pick<AddTagToBookmarkApiPayload, "selectedData">;
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.insert(request.body.data)
			.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
