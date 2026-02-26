import { NextResponse } from "next/server";
import uniqid from "uniqid";

import {
	FetchUserProfileInputSchema,
	FetchUserProfileOutputSchema,
} from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { GET_NAME_FROM_EMAIL_PATTERN, PROFILES } from "@/utils/constants";

function getUserNameFromEmail(email: string): string | null {
	if (email) {
		const match = email.match(GET_NAME_FROM_EMAIL_PATTERN);
		return match?.[1]?.replace(".", "-") ?? null;
	}

	return null;
}

const ROUTE = "v2-profiles-fetch-user-profile";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchUserProfileInputSchema,
	outputSchema: FetchUserProfileOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const { data: profileData, error } = await supabase
			.from(PROFILES)
			.select("*")
			.eq("id", userId);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch user profile",
				error,
				operation: "profile_fetch",
				userId,
			});
		}

		const profile = profileData?.at(0);
		if (!profile) {
			return profileData;
		}

		async function syncProfilePic(avatar: string) {
			const { data: updated, error: updateError } = await supabase
				.from(PROFILES)
				.update({ profile_pic: avatar })
				.match({ id: userId })
				.select("*");

			if (updateError) {
				return apiError({
					route,
					message: "Failed to update profile picture",
					error: updateError,
					operation: "profile_pic_update",
					userId,
				});
			}

			return updated;
		}

		async function assignUsername(email: string) {
			const newUsername = getUserNameFromEmail(email);

			const { data: existingUsers, error: checkError } = await supabase
				.from(PROFILES)
				.select("user_name")
				.eq("user_name", newUsername ?? "");

			if (checkError) {
				return apiError({
					route,
					message: "Failed to check username availability",
					error: checkError,
					operation: "username_check",
					userId,
				});
			}

			const usernameToSet =
				existingUsers && existingUsers.length > 0
					? `${newUsername}-${uniqid.time()}`
					: (newUsername ?? "");

			const { data: usernameData, error: usernameError } = await supabase
				.from(PROFILES)
				.update({ user_name: usernameToSet })
				.match({ id: userId })
				.select("*");

			if (usernameError) {
				return apiError({
					route,
					message: "Failed to update username",
					error: usernameError,
					operation: "username_update",
					userId,
				});
			}

			return usernameData;
		}

		const picResult =
			!profile.profile_pic && data.avatar
				? await syncProfilePic(data.avatar)
				: null;
		if (picResult instanceof NextResponse) {
			return picResult;
		}

		const usernameResult =
			profile.user_name === null
				? await assignUsername(profile.email ?? "")
				: null;
		if (usernameResult instanceof NextResponse) {
			return usernameResult;
		}

		return usernameResult ?? picResult ?? profileData;
	},
});
