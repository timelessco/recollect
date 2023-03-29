// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

// fetches profile pic data for a perticular user

type DataResponse = UserProfilePicTypes[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	verify(
		request.query.access_token as string,
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

	const { email } = request.query;

	if (!email || isEmpty(email)) {
		response.status(500).json({ data: null, error: "User email is missing" });
		throw new Error("ERROR");
	}

	const { data, error } = (await supabase
		.from(PROFILES)
		.select(`profile_pic`)
		.eq("email", email)) as unknown as {
		data: DataResponse;
		error: ErrorResponse;
	};

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
