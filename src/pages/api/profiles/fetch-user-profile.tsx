// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil } from "lodash";
import isNull from "lodash/isNull";
import uniqid from "uniqid";

import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { getUserNameFromEmail } from "../../../utils/helpers";

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
				throw new Error("ERROR: token error");
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

	let finalData;

	const { data: profileData, error } = (await supabase
		.from(PROFILES)
		.select(`*`)
		.eq("id", userId)) as unknown as {
		data: DataResponse;
		error: ErrorResponse;
	};

	finalData = profileData;

	if (
		!isEmpty(profileData) &&
		!isNull(profileData) &&
		isNull(profileData[0]?.profile_pic) &&
		!isNil(existingOauthAvatar)
	) {
		// updates profile pic if its not there in DB and oAuth profile pic is there
		const { data: updateProfilePicData, error: updateProfilePicError } =
			await supabase
				.from(PROFILES)
				.update({
					profile_pic: existingOauthAvatar,
				})
				.match({ id: userId })
				.select(`*`);

		if (!isNull(updateProfilePicError)) {
			response.status(500).json({ data: null, error: updateProfilePicError });
			throw new Error("UPDATE PROFILE_PIC ERROR");
		} else {
			finalData = updateProfilePicData;
		}
	}

	// updates username if its not present
	if (
		!isEmpty(profileData) &&
		!isNull(profileData) &&
		isNil(profileData[0]?.user_name)
	) {
		const newUsername = getUserNameFromEmail(
			profileData[0].email as unknown as string,
		);

		// check if username is already present
		const {
			data: checkData,
			error: checkError,
		}: { data: DataResponse; error: ErrorResponse } = await supabase
			.from(PROFILES)
			.select(`user_name`)
			.eq("user_name", newUsername);

		if (!isNull(checkError)) {
			throw new Error("ERROR: Check if username is there error");
		}

		if (isEmpty(checkData)) {
			// the username is not present
			const { data: userNameNotPresentUpdateData, error: updateUsernameError } =
				await supabase
					.from(PROFILES)
					.update({
						user_name: newUsername,
					})
					.match({ id: userId })
					.select(`*`);

			if (!isNull(updateUsernameError)) {
				throw new Error("ERROR: Update username when its not present error");
			} else {
				finalData = userNameNotPresentUpdateData;
			}
		} else {
			// the user name is already present
			const uniqueUsername = `${newUsername}-${uniqid.time()}`;
			const {
				data: updateUniqueUsernameData,
				error: updateUniqueUsernameError,
			} = await supabase
				.from(PROFILES)
				.update({
					user_name: uniqueUsername,
				})
				.match({ id: userId })
				.select(`*`);

			if (!isNull(updateUniqueUsernameError)) {
				throw new Error("ERROR: Update unique username error");
			} else {
				finalData = updateUniqueUsernameData;
			}
		}
	}

	if (isNull(error)) {
		response.status(200).json({ data: finalData, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR");
	}
}
