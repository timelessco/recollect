// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { isEmpty } from "lodash";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateUserProfileApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates profile for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateUserProfileApiPayload>,
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
				"[update-user-profile] Unauthorized: User not authenticated",
			);
			response.status(401).json({
				data: null,
				error: {
					message: "Unauthorized: Please log in to update your profile",
				},
			});
			return;
		}

		const userId = userData.data.user.id;

		// Validate request body
		if (!request.body?.updateData || isEmpty(request.body.updateData)) {
			console.error(
				"[update-user-profile] Invalid request: Missing updateData",
				{
					userId,
					body: request.body,
				},
			);
			Sentry.captureException(
				new Error("[update-user-profile] Invalid request: Missing updateData"),
			);
			response.status(400).json({
				data: null,
				error: { message: "Invalid request: Missing profile data to update" },
			});
			return;
		}

		// Validate userId
		if (!userId) {
			console.error("[update-user-profile] Invalid user data: Missing userId");
			Sentry.captureException(
				new Error("[update-user-profile] Invalid user data: Missing userId"),
			);
			response.status(400).json({
				data: null,
				error: { message: "Invalid user data: Missing user ID" },
			});
			return;
		}

		// Update user profile
		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(PROFILES)
				.update(request.body.updateData)
				.match({ id: userId })
				.select();

		// Handle database error
		if (error) {
			console.error("[update-user-profile] Database error:", {
				error,
				userId,
				table: PROFILES,
				operation: "update",
			});
			Sentry.captureException(error);

			response.status(500).json({
				data: null,
				error: isEmpty(error) ? { message: "Failed to update profile" } : error,
			});
			return;
		}

		// Check if update was successful (data should not be empty)
		if (isEmpty(data) || !data) {
			console.error(
				"[update-user-profile] Update failed: No data returned after update",
				{
					userId,
					updateData: request.body.updateData,
				},
			);
			Sentry.captureException(
				new Error(
					"[update-user-profile] Update failed: No data returned after update",
				),
			);
			response.status(500).json({
				data: null,
				error: { message: "Profile update failed: No data returned" },
			});
			return;
		}

		// Success - return updated data
		response.status(200).json({ data, error: null });
		return;
	} catch (unexpectedError) {
		// Catch any unexpected errors
		console.error("[update-user-profile] Unexpected error:", unexpectedError, {
			method: request.method,
			url: request.url,
			body: request.body,
		});
		Sentry.captureException(unexpectedError);

		// Check if response was already sent
		if (!response.headersSent) {
			response.status(500).json({
				data: null,
				error: {
					message: "An unexpected error occurred while updating profile",
				},
			});
			return;
		}

		// If response was already sent, just log the error
		console.error(
			"[update-user-profile] Error occurred after response was sent:",
			unexpectedError,
		);
		Sentry.captureException(unexpectedError);
	}
}
