import {
	FetchUserProfilePicInputSchema,
	FetchUserProfilePicOutputSchema,
} from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-profiles-fetch-user-profile-pic";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: FetchUserProfilePicInputSchema,
	outputSchema: FetchUserProfilePicOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const { data: result, error } = await supabase
			.from(PROFILES)
			.select("profile_pic")
			.eq("email", data.email);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch user profile picture",
				error,
				operation: "profile_pic_fetch",
				userId,
				extra: { email: data.email },
			});
		}

		return result;
	},
});
