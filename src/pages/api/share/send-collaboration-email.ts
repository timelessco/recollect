import { title } from "node:process";
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { sign, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type NextApiRequest,
	type SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	getBaseUrl,
	NEXT_API_URL,
	SEND_EMAIL,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	error: PostgrestError | VerifyErrors | string | null;
	message?: string;
	url: string | null;
};

export default async function handler(
	request: NextApiRequest<SendCollaborationEmailInviteApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const { emailList } = request.body;
	const hostUrl = request?.body?.hostUrl;
	const categoryId = request?.body?.category_id;
	const editAccess = request?.body?.edit_access;

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	const { data: existingRows, error: checkError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.select("*")
		.eq("category_id", categoryId)
		.eq("email", emailList[0])
		.maybeSingle();

	if (checkError) {
		console.log("Error checking existing rows", checkError);
		Sentry.captureException(checkError, {
			extra: {
				errorMessage: checkError,
			},
		});
		response
			.status(500)
			.json({ url: null, error: "Error checking existing rows" });
		return;
	}

	if (existingRows) {
		console.warn("Email already exists", existingRows);
		response.status(409).json({ url: null, error: "Email already exists" });
		return;
	}

	const { error } = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
		category_id: categoryId,
		email: emailList[0],
		edit_access: editAccess,
		user_id: userId,
		is_accept_pending: true,
	});

	if (!isNull(error)) {
		console.warn("Error inserting row", error);
		Sentry.captureException(error, {
			extra: {
				errorMessage: error,
			},
		});
		response.status(500).json({ url: null, error });
		return;
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

	const { data } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
    *,
    profiles:user_id (
      id,
      user_name,
			display_name,
      email
    )
  `,
		)
		.eq("id", categoryId);

	const categoryData = data?.[0];

	if (process.env.NODE_ENV !== "development") {
		try {
			await axios.post(`${getBaseUrl()}${NEXT_API_URL}${SEND_EMAIL}`, {
				url,
				display_name:
					categoryData?.profiles?.display_name ||
					categoryData?.profiles?.user_name,
				category_name: categoryData?.category_name,
				emailList: emailList[0],
			});

			response.status(200).json({ url, error: null });
		} catch (catchError: unknown) {
			console.error("Error in resend email api", catchError);
			Sentry.captureException(catchError, {
				extra: {
					errorMessage: catchError,
				},
			});
			response.status(500).json({
				url: null,
				error: catchError as string,
				message: "error in resend email api",
			});
		}
	} else {
		response
			.status(200)
			.json({ url, error: null, message: "in dev mode email not sent" });
	}
}
