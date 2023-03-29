// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import {
	type NextApiRequest,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARK_TAGS_TABLE_NAME } from "../../../utils/constants";

// removes tags for a bookmark

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest<{ bookmark_id: number; tag_id: number }>,
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
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.delete()
			.match({
				tag_id: request.body?.tag_id,
				bookmark_id: request.body?.bookmark_id,
			})
			.select();

	if (isEmpty(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		throw new Error("ERROR");
	}

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
