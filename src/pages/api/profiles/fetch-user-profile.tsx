// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil } from "lodash";
import isNull from "lodash/isNull";

import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

// fetches profiles data for a perticular user
// checks if profile pic is present
// if its not present and in session data some oauth profile pic is there, then we update the oauth profile pic in profiles table
// we are doing this because in auth triggers we do not get the oauth profile pic

type DataResponse = ProfilesTableTypes[] | null;
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

	const userId = request.query.user_id;
	const existingOauthAvatar = request.query?.avatar;

	if (!userId || isEmpty(userId)) {
		response.status(500).json({ data: null, error: "User id is missing" });
		throw new Error("ERROR");
	}

	const { data, error } = (await supabase
		.from(PROFILES)
		.select(`*`)
		.eq("id", userId)) as unknown as {
		data: DataResponse;
		error: ErrorResponse;
	};

	if (
		!isEmpty(data) &&
		!isNull(data) &&
		isNull(data[0]?.profile_pic) &&
		!isNil(existingOauthAvatar)
	) {
		const { error: updateProfilePicError } = await supabase
			.from(PROFILES)
			.update({
				profile_pic: existingOauthAvatar,
			})
			.match({ id: userId });

		if (!isNull(updateProfilePicError)) {
			response.status(500).json({ data: null, error: updateProfilePicError });
			throw new Error("UPDATE PROFILE_PIC ERROR");
		}
	}

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
