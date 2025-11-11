// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import { type UserTagsData } from "../../../types/apiTypes";
import { TAG_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches tags for a perticular user

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Fetches all tags for the authenticated user
 * @param {NextApiRequest} request - Request object
 * @param {NextApiResponse<Data>} response - Response object
 * @returns {Promise<NextApiResponse<Data>>} - User tags or error
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	// Validate HTTP method
	if (request.method !== "GET") {
		response.status(405).json({
			data: null,
			error: "Only GET requests allowed",
		});
		return;
	}

	try {
		const supabase = apiSupabaseClient(request, response);

		// Get authenticated user
		const userResponse = await supabase?.auth?.getUser();
		const userId = userResponse?.data?.user?.id as string;

		// Validate user authentication
		if (!userId || isEmpty(userId)) {
			console.error("[fetch-user-tags][auth] User ID is missing");
			Sentry.captureException(
				new Error("[fetch-user-tags][auth] User ID is missing"),
			);
			response.status(401).json({
				data: null,
				error: "Unauthorized: User authentication required",
			});
			return;
		}

		// Fetch user tags from database
		const { data, error } = (await supabase
			.from(TAG_TABLE_NAME)
			.select(`*`)
			.eq("user_id", userId)) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		// Handle database errors
		if (!isNull(error)) {
			const errorMessage =
				typeof error === "string"
					? error
					: (error as PostgrestError)?.message || "Unknown database error";

			console.error("[fetch-user-tags][database] Failed to fetch user tags:", {
				errorMessage,
				userId,
				tableName: TAG_TABLE_NAME,
				errorDetails: error,
			});
			Sentry.captureException(error);

			response.status(500).json({
				data: null,
				error: "Failed to fetch user tags",
			});
			return;
		}

		// Success response
		response.status(200).json({ data, error: null });
	} catch (error) {
		// Catch-all for unexpected errors
		console.error(
			"[fetch-user-tags][unexpected-error] Internal server error:",
			{
				error,
				errorType: typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		);
		Sentry.captureException(error);

		response.status(500).json({
			data: null,
			error: "Internal server error",
		});
	}
}
