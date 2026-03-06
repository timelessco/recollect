import { deleteProfilePic } from "./delete-logic";
import {
	RemoveProfilePicInputSchema,
	RemoveProfilePicOutputSchema,
} from "./schema";
import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-profiles-remove-profile-pic";

export const DELETE = createDeleteApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RemoveProfilePicInputSchema,
	outputSchema: RemoveProfilePicOutputSchema,
	handler: async ({ supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const { data: removeData, error: removeError } = await supabase
			.from(PROFILES)
			.update({ profile_pic: null })
			.match({ id: userId })
			.select("profile_pic");

		if (removeError) {
			return apiError({
				route,
				message: "Failed to remove profile picture",
				error: removeError,
				operation: "profile_pic_db_remove",
				userId,
			});
		}

		await deleteProfilePic({ userId });

		return removeData;
	},
});
