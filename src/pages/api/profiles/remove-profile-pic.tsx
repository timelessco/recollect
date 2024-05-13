// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";
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
	const supabase = apiSupabaseClient(request, response);
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

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

		await deleteLogic(supabase, response, userId);

		response.status(200).json({ data: removeData, error: null });
	} else {
		response.status(500).json({ data: null, error: "User id is missing" });
		throw new Error("ERROR: User id is missing");
	}
}
