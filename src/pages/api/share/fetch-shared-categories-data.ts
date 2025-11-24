// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches shared categories

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

		// Check for auth errors
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;
		const email = userData?.user?.email;

		if (userError || !userId || !email) {
			console.warn("User authentication failed:", {
				error: userError?.message,
				userId: userId ?? "missing",
				email: email ?? "missing",
			});
			response.status(401).json({
				data: null,
				error: "Unauthorized: Please log in to access shared categories",
			});
			return;
		}

		// Entry point log
		console.log("fetch-shared-categories-data API called:", { userId, email });

		// Fetch data where user is either a collaborator or owner of the category
		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select()
				.or(`email.eq.${email},user_id.eq.${userId}`);

		// Handle database error
		if (error) {
			console.error("Error fetching shared categories:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "fetch_shared_categories",
					userId,
				},
				extra: {
					email,
					table: SHARED_CATEGORIES_TABLE_NAME,
				},
			});

			// Determine appropriate status code based on error type
			const statusCode =
				(error as PostgrestError)?.code === "PGRST116" ? 404 : 500;

			response.status(statusCode).json({
				data: null,
				error: "Error fetching shared categories",
			});
			return;
		}

		// Success log and response
		console.log("Shared categories fetched successfully:", {
			userId,
			count: data?.length ?? 0,
		});
		response.status(200).json({ data, error: null });
	} catch (unexpectedError) {
		console.error(
			"Unexpected error in fetch-shared-categories-data:",
			unexpectedError,
		);
		Sentry.captureException(unexpectedError, {
			tags: {
				operation: "fetch_shared_categories",
			},
			extra: {
				method: request.method,
				url: request.url,
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred while fetching shared categories",
		});
	}
}
