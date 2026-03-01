import slugify from "slugify";

import {
	UpdateUsernameInputSchema,
	UpdateUsernameOutputSchema,
} from "./schema";
import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "v2-profiles-update-username";

export const PATCH = createPatchApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: UpdateUsernameInputSchema,
	outputSchema: UpdateUsernameOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;
		const username = slugify(data.username, { lower: true, strict: true });

		console.log(`[${route}] API called:`, { userId, username });

		const { data: checkData, error: checkError } = await supabase
			.from(PROFILES)
			.select("user_name")
			.eq("user_name", username);

		if (checkError) {
			return apiError({
				route,
				message: "Failed to check username availability",
				error: checkError,
				operation: "username_check",
				userId,
			});
		}

		if (checkData.length > 0) {
			return apiWarn({
				route,
				message: "Username already exists, please try another username",
				status: 409,
				context: { username },
			});
		}

		const { data: updateData, error: updateError } = await supabase
			.from(PROFILES)
			.update({ user_name: username })
			.match({ id: userId })
			.select("user_name");

		if (updateError) {
			return apiError({
				route,
				message: "Failed to update username",
				error: updateError,
				operation: "username_update",
				userId,
			});
		}

		return updateData;
	},
});
