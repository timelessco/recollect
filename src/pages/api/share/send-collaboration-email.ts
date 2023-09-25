// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
// import fromData from "form-data";
import { sign, verify, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

// import MainGun from "mailgun.js";

import {
	type NextApiRequest,
	type SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";
import {
	NEXT_API_URL,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";

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
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ url: null, error: error_ });
				throw new Error("ERROR");
			}
		},
	);

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

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
			await axios.post(`${NEXT_API_URL}/share/send-email`, {
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
