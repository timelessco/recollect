// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextApiResponse } from "next";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
// import fromData from "form-data";
import { sign, verify, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";
// import MainGun from "mailgun.js";

import Email from "vercel-email";

import {
	type NextApiRequest,
	type SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";

// import jwt_decode from 'jwt-decode';

/**
 * Builds invite link for a user to be added as colaborator and sends it via email
 */

type Data = {
	error: PostgrestError | VerifyErrors | string | null;
	url: string | null;
};

export default async function handler(
	request: NextApiRequest<SendCollaborationEmailInviteApiPayload>,
	response: NextApiResponse<Data>,
) {
	if (process.env.NODE_ENV === "development") {
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

		response.status(200).json({ url, error: null });
	} else {
		const data = await (request as unknown as NextRequest).json();

		verify(
			data.access_token,
			process.env.SUPABASE_JWT_SECRET_KEY,
			(error_: unknown) => {
				if (error_) {
					NextResponse.json({ url: null, error: error_ });
					throw new Error("ERROR");
				}
			},
		);
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.SUPABASE_SERVICE_KEY,
		);
		const { emailList } = data;
		const hostUrl = data?.hostUrl;
		const categoryId = data?.category_id;
		const editAccess = data?.edit_access;
		const userId = data?.userId;
		const { error } = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
			category_id: categoryId,
			email: emailList[0],
			edit_access: editAccess,
			user_id: userId,
			is_accept_pending: true,
		});
		if (!isNull(error)) {
			NextResponse.json({ url: null, error });
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
		// const mailgun = new Mailgun(formData);
		// const mg = mailgun.client({
		// 	username: "api",
		// 	key: "",
		// });
		// mg.messages
		// 	.create("", {
		// 		from: "Excited User <mailgun@>",
		// 		to: "abhishek@timeless.co",
		// 		subject: "Bookmarks invite",
		// 		text: "Bookmarks invite link",
		// 		html: `<div>This is your invite link <a href=${url}>${url}</a></div>`,
		// 	})
		// 	.then((message) => console.log("email success", message)) // logs response data
		// 	.catch((error_) => console.log("error1123", error_));
		// response.status(200).json({ url, error: null });
		await Email.send({
			to: emailList[0],
			from: "noreply@laterpad.tmls.dev",
			subject: "Laterpad Invite",
			text: `Please click on this invite link to join the category ${url}`,
		});
	}
}

export const config = {
	runtime: process.env.NODE_ENV === "development" ? "nodejs" : "edge",
};
