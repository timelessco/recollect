import type { Database } from "@/types/database.types";

import { createPatchApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import { UpdateUserProfileInputSchema, UpdateUserProfileOutputSchema } from "./schema";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const ROUTE = "v2-profiles-update-user-profile";

export const PATCH = createPatchApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const updatePayload = toDbType<ProfileUpdate>(data.updateData);

    const { data: profileData, error } = await supabase
      .from(PROFILES)
      .update(updatePayload)
      .match({ id: userId })
      .select();

    if (error) {
      return apiError({
        error,
        message: "Failed to update profile",
        operation: "profile_update",
        route,
        userId,
      });
    }

    if (!profileData || profileData.length === 0) {
      return apiWarn({
        context: { userId },
        message: "Profile not found",
        route,
        status: 404,
      });
    }

    return profileData;
  },
  inputSchema: UpdateUserProfileInputSchema,
  outputSchema: UpdateUserProfileOutputSchema,
  route: ROUTE,
});
