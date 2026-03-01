import {
	UpdateUserProfileInputSchema,
	UpdateUserProfileOutputSchema,
} from "./schema";
import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { type Database } from "@/types/database.types";
import { PROFILES } from "@/utils/constants";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const ROUTE = "v2-profiles-update-user-profile";

export const PATCH = createPatchApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: UpdateUserProfileInputSchema,
	outputSchema: UpdateUserProfileOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const { data: profileData, error } = await supabase
			.from(PROFILES)
			.update(data.updateData as ProfileUpdate)
			.match({ id: userId })
			.select();

		if (error) {
			return apiError({
				route,
				message: "Failed to update profile",
				error,
				operation: "profile_update",
				userId,
			});
		}

		if (!profileData || profileData.length === 0) {
			return apiWarn({
				route,
				message: "Profile not found",
				status: 404,
				context: { userId },
			});
		}

		return profileData;
	},
});
