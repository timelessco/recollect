// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type NextApiRequest,
	type ProfilesTableTypes,
	type UpdateUsernameApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";

type DataResponse = ProfilesTableTypes[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates username for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateUsernameApiPayload>,
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

	// check if username is already present

	const {
		data: checkData,
		error: checkError,
	}: { data: DataResponse; error: ErrorResponse } = await supabase
		.from(PROFILES)
		.select(`user_name`)
		.eq("user_name", request.body.username);

	if (!isNull(checkError)) {
		response.status(500).json({
			data: null,
			error: checkError,
		});
		throw new Error("ERROR");
	}

	if (isEmpty(checkData)) {
		// user name is not there so we update
		const {
			data: updateData,
			error: updateError,
		}: { data: DataResponse; error: ErrorResponse } = await supabase
			.from(PROFILES)
			.update({
				user_name: request.body.username,
			})
			.match({ id: request.body.id })
			.select(`user_name`);

		if (!isNull(updateError)) {
			response.status(500).json({
				data: null,
				error: updateError,
			});
			throw new Error("ERROR");
		}

		response.status(200).json({
			data: updateData,
			error: null,
		});
	} else {
		// user name is already present in the DB
		response.status(500).json({
			data: null,
			error: "Username already exists, please try another username",
		});
		throw new Error("ERROR");
	}
}
