// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches shared categories

export const config = {
	maxDuration: 30,
};

type DataResponse = FetchSharedCategoriesData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;
type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
): Promise<void> {
	try {
		// Initialize Supabase client
		const supabase = apiSupabaseClient(request, response);

		// Get authenticated user
		const userData = await supabase?.auth?.getUser();

		// Check if user is authenticated
		if (!userData?.data?.user) {
			console.warn(
				"[fetch-shared-categories-data] Unauthorized: User not authenticated",
			);
			response.status(401).json({
				data: null,
				error: "Unauthorized: Please log in to access shared categories",
			});
			return;
		}

		const userId = userData.data.user.id;
		const email = userData.data.user.email;

		// Validate user data
		if (!userId || !email) {
			console.error("[fetch-shared-categories-data] Invalid user data:", {
				userId: userId ?? "missing",
				email: email ?? "missing",
			});
			Sentry.captureException(
				new Error(
					"[fetch-shared-categories-data] Invalid user data: Missing required fields",
				),
			);
			response.status(400).json({
				data: null,
				error: "Invalid user data: Missing required fields",
			});
			return;
		}

		// Fetch data where user is either a collaborator or owner of the category
		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select()
				.or(`email.eq.${email},user_id.eq.${userId}`);

		// Handle database error
		if (error) {
			console.error("[fetch-shared-categories-data] Database error:", {
				error,
				table: SHARED_CATEGORIES_TABLE_NAME,
				operation: "select",
				query: `email.eq.${email},user_id.eq.${userId}`,
				userId,
				email,
			});
			Sentry.captureException(error);

			// Determine appropriate status code based on error type
			const statusCode =
				(error as PostgrestError)?.code === "PGRST116" ? 404 : 500;

			response.status(statusCode).json({
				data: null,
				error: typeof error === "object" ? JSON.stringify(error) : error,
			});
			return;
		}

		// Success - return data
		response.status(200).json({ data, error: null });
		return;
	} catch (unexpectedError) {
		// Catch any unexpected errors
		console.error(
			"[fetch-shared-categories-data] Unexpected error:",
			unexpectedError,
			{
				method: request.method,
				url: request.url,
			},
		);
		Sentry.captureException(unexpectedError);

		// Check if response was already sent
		if (!response.headersSent) {
			response.status(500).json({
				data: null,
				error: "An unexpected error occurred while fetching shared categories",
			});
			return;
		}

		// If response was already sent, just log the error
		console.error(
			"[fetch-shared-categories-data] Error occurred after response was sent:",
			unexpectedError,
		);
		Sentry.captureException(unexpectedError);
	}
}
