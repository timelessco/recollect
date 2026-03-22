import { createDeleteApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { deleteProfilePic } from "./delete-logic";
import { RemoveProfilePicInputSchema, RemoveProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-profiles-remove-profile-pic";

export const DELETE = createDeleteApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data: removeData, error: removeError } = await supabase
      .from(PROFILES)
      .update({ profile_pic: null })
      .match({ id: userId })
      .select("profile_pic");

    if (removeError) {
      return apiError({
        error: removeError,
        message: "Failed to remove profile picture",
        operation: "profile_pic_db_remove",
        route,
        userId,
      });
    }

    await deleteProfilePic({ userId });

    return removeData;
  },
  inputSchema: RemoveProfilePicInputSchema,
  outputSchema: RemoveProfilePicOutputSchema,
  route: ROUTE,
});
