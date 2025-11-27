// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { request } from "http";
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import { email } from "zod";

import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = UserProfilePicTypes[] | null;
type ErrorResponse =
	| PostgrestError
	| VerifyErrors
	| string
	| { message: string }
	| null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Fetches profile picture data for a specific user by email
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
): Promise<void> {
	try {
		// Initialize Supabase client
		const supabase = apiSupabaseClient(request, response);

		// Get email from query params
		const { email } = request.query;

		// Validate email parameter
		if (!email || isEmpty(email)) {
			console.error(
				"[fetch-user-profile-pic] Invalid request: Missing email parameter",
				{
					query: request.query,
				},
			);
			Sentry.captureException(
				new Error(
					"[fetch-user-profile-pic] Invalid request: Missing email parameter",
				),
				{ tags: { operation: "validate_request" } },
			);
			response.status(400).json({
				data: null,
				error: { message: "Invalid request: Email parameter is required" },
			});
			return;
		}

		// Fetch user profile picture from database
		const { data, error } = (await supabase
			.from(PROFILES)
			.select(`profile_pic`)
			.eq("email", email)) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		// Handle database error
		if (error) {
			console.error("[fetch-user-profile-pic] Database error:", {
				error,
				email,
				table: PROFILES,
				operation: "select",
			});
			Sentry.captureException(error, {
				tags: { operation: "fetch_profile_pic" },
				extra: { email },
			});

			response.status(500).json({
				data: null,
				error: { message: "Failed to fetch user profile picture" },
			});
			return;
		}

		// Success - return profile picture data
		console.log(
			"[fetch-user-profile-pic] Successfully fetched profile picture",
			{
				email,
			},
		);
		response.status(200).json({ data, error: null });
	} catch (unexpectedError) {
		// Catch any unexpected errors
		console.error(
			"[fetch-user-profile-pic] Unexpected error:",
			unexpectedError,
			{
				method: request.method,
				url: request.url,
				query: request.query,
			},
		);
		Sentry.captureException(unexpectedError, {
			tags: { operation: "fetch_profile_pic" },
		});

		response.status(500).json({
			data: null,
			error: {
				message: "An unexpected error occurred while fetching profile picture",
			},
		});
	}
}
