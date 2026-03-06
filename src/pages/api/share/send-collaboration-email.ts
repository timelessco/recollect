import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { sign, type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

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

import { vet } from "@/utils/try";

type Data = {
	error: PostgrestError | VerifyErrors | string | null;
	message?: string;
	url: string | null;
};

export default async function handler(
	request: NextApiRequest<SendCollaborationEmailInviteApiPayload>,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		const { emailList } = request.body;
		const hostUrl = request?.body?.hostUrl;
		const categoryId = request?.body?.category_id;
		const editAccess = request?.body?.edit_access;

		// Check for auth errors
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({ url: null, error: "Unauthorized" });
			return;
		}

		// Entry point log
		console.log("send-collaboration-email API called:", {
			userId,
			categoryId,
			emailList,
		});

		const { data: existingRows, error: checkError } = await supabase
			.from(SHARED_CATEGORIES_TABLE_NAME)
			.select("*")
			.eq("category_id", categoryId)
			.eq("email", emailList[0])
			.maybeSingle();

		if (checkError) {
			console.error("Error checking existing rows:", checkError);
			Sentry.captureException(checkError, {
				tags: {
					operation: "check_existing_collaboration",
					userId,
				},
				extra: { categoryId, email: emailList[0] },
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
			console.error("Error inserting collaboration row:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "insert_collaboration",
					userId,
				},
				extra: { categoryId, email: emailList[0] },
			});
			response.status(500).json({ url: null, error: "Error inserting row" });
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

		if (process.env.NODE_ENV === "development") {
			console.log("Dev mode - email not sent:", { url });
			response
				.status(200)
				.json({ url, error: null, message: "in dev mode email not sent" });
			return;
		}

		const [emailError] = await vet(() =>
			axios.post(`${getBaseUrl()}${NEXT_API_URL}${SEND_EMAIL}`, {
				url,
				display_name:
					categoryData?.profiles?.display_name ||
					categoryData?.profiles?.user_name,
				category_name: categoryData?.category_name,
				emailList: emailList[0],
			}),
		);

		if (emailError) {
			console.error("Error in resend email API:", emailError);
			Sentry.captureException(emailError, {
				tags: {
					operation: "send_collaboration_email",
					userId,
				},
				extra: { categoryId, email: emailList[0] },
			});
			response.status(500).json({
				url: null,
				error: "Error sending email",
				message: "error in resend email api",
			});
			return;
		}

		console.log("Collaboration email sent successfully:", {
			categoryId,
			email: emailList[0],
		});
		response.status(200).json({ url, error: null });
	} catch (error) {
		console.error("Unexpected error in send-collaboration-email:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "send_collaboration_email_unexpected",
			},
		});
		response.status(500).json({
			url: null,
			error: "An unexpected error occurred",
		});
	}
}
