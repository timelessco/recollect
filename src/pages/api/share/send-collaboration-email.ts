// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
// import fromData from "form-data";
import { sign, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

// import MainGun from "mailgun.js";

import {
	type NextApiRequest,
	type SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";
import {
	getBaseUrl,
	NEXT_API_URL,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// import jwt_decode from 'jwt-decode';

/**
 * Builds invite link for a user to be added as colaborator and sends it via email
 */

type Data = {
	error: PostgrestError | VerifyErrors | string | null;
	message?: string;
	url: string | null;
};

export default async function handler(
	request: NextApiRequest<SendCollaborationEmailInviteApiPayload>,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ url: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const { emailList } = request.body;
	const hostUrl = request?.body?.hostUrl;
	const categoryId = request?.body?.category_id;
	const editAccess = request?.body?.edit_access;
	const userId = request?.body?.userId;

	const { error } = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
		category_id: categoryId,
		email: emailList[0],
		edit_access: editAccess,
		user_id: userId,
		is_accept_pending: true,
	});

	if (!isNull(error)) {
		response.status(500).json({ url: null, error });
		throw new Error("ERROR");
	}

	const token = sign(
		{
			email: emailList[0],
			category_id: categoryId,
			edit_access: editAccess,
			userId,
		},
		"shhhhh",
	);
	const url = `${hostUrl}/api/invite?token=${token}`;

	if (process.env.NODE_ENV !== "development") {
		try {
			await axios.post(`${getBaseUrl()}${NEXT_API_URL}/share/send-email`, {
				url,
				emailList: emailList[0],
			});
			response.status(200).json({ url, error });
		} catch (catchError: unknown) {
			response.status(500).json({
				url: null,
				error: catchError as string,
				message: "error in vercel email api",
			});
		}
	} else {
		response.status(200).json({ url, error: null, message: "in dev mode" });
	}
}
