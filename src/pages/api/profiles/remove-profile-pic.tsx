// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { deleteLogic } from "../settings/upload-profile-pic";

// removes user profile pic

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
		request.body.access_token as string,
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

	const userId = request.body.id;

	if (userId) {
		// remove from DB
		const { data: removeData, error: removeError } = await supabase
			.from(PROFILES)
			.update({
				profile_pic: null,
			})
			.match({ id: userId })
			.select(`profile_pic`);

		if (!isNull(removeError)) {
			response.status(500).json({ data: null, error: removeError });
			throw new Error("ERROR: remove error");
		}

		// remove from bucket

		await deleteLogic(supabase, response, request?.body?.id);

		response.status(200).json({ data: removeData, error: null });
	} else {
		response.status(500).json({ data: null, error: "User id is missing" });
		throw new Error("ERROR: User id is missing");
	}
}
