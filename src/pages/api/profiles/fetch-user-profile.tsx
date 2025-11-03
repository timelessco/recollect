/* eslint-disable no-console */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil } from "lodash";
import uniqid from "uniqid";

import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { getUserNameFromEmail } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// fetches profiles data for a particular user
// checks if profile pic is present
// if its not present and in session data some oauth profile pic is there, then we update the oauth profile pic in profiles table
// we are doing this because in auth triggers we do not get the oauth profile pic

type DataResponse = ProfilesTableTypes[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// eslint-disable-next-line consistent-return
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
			console.warn("[fetch-user-profile] Unauthorized: User not authenticated");
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			return response.status(401).json({
				data: null,
				error: "Unauthorized: Please log in to access your profile",
			});
		}

		const userId = userData.data.user.id;
		const existingOauthAvatar = request.query?.avatar;

		// Validate userId
		if (!userId || isEmpty(userId)) {
			console.error("[fetch-user-profile] Invalid user data: Missing userId");
			Sentry.captureException(
				new Error("[fetch-user-profile] Invalid user data: Missing userId"),
			);
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			return response.status(400).json({
				data: null,
				error: "Invalid user data: Missing user ID",
			});
		}

		let finalData: DataResponse;

		// Fetch user profile
		const { data: profileData, error } = (await supabase
			.from(PROFILES)
			.select(`*`)
			.eq("id", userId)) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		// Handle database error
		if (error) {
			console.error("[fetch-user-profile] Database error fetching profile:", {
				error,
				userId,
				table: PROFILES,
			});
			Sentry.captureException(error);
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			return response.status(500).json({ data: null, error });
		}

		finalData = profileData;

		// Update profile pic if needed
		if (
			!isEmpty(profileData) &&
			profileData &&
			!profileData[0]?.profile_pic &&
			!isNil(existingOauthAvatar)
		) {
			const { data: updateProfilePicData, error: updateProfilePicError } =
				await supabase
					.from(PROFILES)
					.update({
						profile_pic: existingOauthAvatar,
					})
					.match({ id: userId })
					.select(`*`);

			if (updateProfilePicError) {
				console.error("[fetch-user-profile] Error updating profile picture:", {
					error: updateProfilePicError,
					userId,
				});
				Sentry.captureException(updateProfilePicError);
				// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
				return response
					.status(500)
					.json({ data: null, error: updateProfilePicError });
			}

			finalData = updateProfilePicData;
		}

		// Update username if not present
		if (
			!isEmpty(profileData) &&
			profileData &&
			isNil(profileData[0]?.user_name)
		) {
			const newUsername = getUserNameFromEmail(
				profileData[0].email as unknown as string,
			);

			// Check if username is already present
			const { data: checkData, error: checkError } = await supabase
				.from(PROFILES)
				.select(`user_name`)
				.eq("user_name", newUsername);

			if (checkError) {
				console.error(
					"[fetch-user-profile] Error checking username availability:",
					{
						error: checkError,
						username: newUsername,
					},
				);
				Sentry.captureException(checkError);
				// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
				return response.status(500).json({
					data: null,
					error: "Failed to check username availability",
				});
			}

			if (isEmpty(checkData)) {
				// Username is not present - use the generated one
				const {
					data: userNameNotPresentUpdateData,
					error: updateUsernameError,
				} = await supabase
					.from(PROFILES)
					.update({
						user_name: newUsername,
					})
					.match({ id: userId })
					.select(`*`);

				if (updateUsernameError) {
					console.error("[fetch-user-profile] Error updating username:", {
						error: updateUsernameError,
						username: newUsername,
						userId,
					});
					Sentry.captureException(updateUsernameError);
					// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
					return response.status(500).json({
						data: null,
						error: "Failed to update username",
					});
				}

				finalData = userNameNotPresentUpdateData;
			} else {
				// Username already exists - create a unique one
				const uniqueUsername = `${newUsername}-${uniqid.time()}`;

				const {
					data: updateUniqueUsernameData,
					error: updateUniqueUsernameError,
				} = await supabase
					.from(PROFILES)
					.update({
						user_name: uniqueUsername,
					})
					.match({ id: userId })
					.select(`*`);

				if (updateUniqueUsernameError) {
					console.error(
						"[fetch-user-profile] Error updating unique username:",
						{
							error: updateUniqueUsernameError,
							username: uniqueUsername,
							userId,
						},
					);
					Sentry.captureException(updateUniqueUsernameError);
					// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
					return response.status(500).json({
						data: null,
						error: "Failed to create unique username",
					});
				}

				finalData = updateUniqueUsernameData;
			}
		}

		// Success - return profile data
		// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
		return response.status(200).json({ data: finalData, error: null });
	} catch (unexpectedError) {
		// Catch any unexpected errors
		console.error("[fetch-user-profile] Unexpected error:", unexpectedError, {
			method: request.method,
			url: request.url,
		});
		Sentry.captureException(unexpectedError);

		// Check if response was already sent
		if (!response.headersSent) {
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			return response.status(500).json({
				data: null,
				error: "An unexpected error occurred while fetching profile",
			});
		}

		// If response was already sent, just log the error
		console.error(
			"[fetch-user-profile] Error occurred after response was sent:",
			unexpectedError,
		);
		Sentry.captureException(unexpectedError);
	}
}
