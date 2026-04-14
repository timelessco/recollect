/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/share/send-collaboration-email
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { sign } from "jsonwebtoken";
import isNull from "lodash/isNull";

import type {
  NextApiRequest,
  SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { env } from "@/env/server";
import { vet } from "@/utils/try";

import {
  CATEGORIES_TABLE_NAME,
  getBaseUrl,
  NEXT_API_URL,
  SEND_EMAIL,
  SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

interface Data {
  error: null | PostgrestError | string | VerifyErrors;
  message?: string;
  url: null | string;
}

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
      response.status(401).json({ error: "Unauthorized", url: null });
      return;
    }

    // Entry point log
    console.log("send-collaboration-email API called:", {
      categoryId,
      emailList,
      userId,
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
        extra: { categoryId, email: emailList[0] },
        tags: {
          operation: "check_existing_collaboration",
          userId,
        },
      });
      response.status(500).json({ error: "Error checking existing rows", url: null });
      return;
    }

    if (existingRows) {
      console.warn("Email already exists", existingRows);
      response.status(409).json({ error: "Email already exists", url: null });
      return;
    }

    const { error } = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
      category_id: categoryId,
      edit_access: editAccess,
      email: emailList[0],
      is_accept_pending: true,
      user_id: userId,
    });

    if (!isNull(error)) {
      console.error("Error inserting collaboration row:", error);
      Sentry.captureException(error, {
        extra: { categoryId, email: emailList[0] },
        tags: {
          operation: "insert_collaboration",
          userId,
        },
      });
      response.status(500).json({ error: "Error inserting row", url: null });
      return;
    }

    const token = sign(
      {
        category_id: categoryId,
        edit_access: editAccess,
        email: emailList[0],
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

    if (env.NODE_ENV === "development") {
      console.log("Dev mode - email not sent:", { url });
      response.status(200).json({ error: null, message: "in dev mode email not sent", url });
      return;
    }

    const [emailError] = await vet(() =>
      axios.post(`${getBaseUrl()}${NEXT_API_URL}${SEND_EMAIL}`, {
        category_name: categoryData?.category_name,
        display_name: categoryData?.profiles?.display_name ?? categoryData?.profiles?.user_name,
        emailList: emailList[0],
        url,
      }),
    );

    if (emailError) {
      console.error("Error in resend email API:", emailError);
      Sentry.captureException(emailError, {
        extra: { categoryId, email: emailList[0] },
        tags: {
          operation: "send_collaboration_email",
          userId,
        },
      });
      response.status(500).json({
        error: "Error sending email",
        message: "error in resend email api",
        url: null,
      });
      return;
    }

    console.log("Collaboration email sent successfully:", {
      categoryId,
      email: emailList[0],
    });
    response.status(200).json({ error: null, url });
  } catch (error) {
    console.error("Unexpected error in send-collaboration-email:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "send_collaboration_email_unexpected",
      },
    });
    response.status(500).json({
      error: "An unexpected error occurred",
      url: null,
    });
  }
}
