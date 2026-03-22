import slugify from "slugify";

import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { UpdateUsernameInputSchema, UpdateUsernameOutputSchema } from "./schema";

const ROUTE = "v2-profiles-update-username";

export const PATCH = createPatchApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;
    const username = slugify(data.username, { lower: true, strict: true });

    console.log(`[${route}] API called:`, { userId, username });

    const { data: checkData, error: checkError } = await supabase
      .from(PROFILES)
      .select("user_name")
      .eq("user_name", username);

    if (checkError) {
      return apiError({
        error: checkError,
        message: "Failed to check username availability",
        operation: "username_check",
        route,
        userId,
      });
    }

    if (checkData.length > 0) {
      return apiWarn({
        context: { username },
        message: "Username already exists, please try another username",
        route,
        status: 409,
      });
    }

    const { data: updateData, error: updateError } = await supabase
      .from(PROFILES)
      .update({ user_name: username })
      .match({ id: userId })
      .select("user_name");

    if (updateError) {
      return apiError({
        error: updateError,
        message: "Failed to update username",
        operation: "username_update",
        route,
        userId,
      });
    }

    return updateData;
  },
  inputSchema: UpdateUsernameInputSchema,
  outputSchema: UpdateUsernameOutputSchema,
  route: ROUTE,
});
