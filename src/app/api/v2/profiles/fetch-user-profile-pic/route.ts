import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { FetchUserProfilePicInputSchema, FetchUserProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-profiles-fetch-user-profile-pic";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data: result, error } = await supabase
      .from(PROFILES)
      .select("profile_pic")
      .eq("email", data.email);

    if (error) {
      return apiError({
        error,
        extra: { email: data.email },
        message: "Failed to fetch user profile picture",
        operation: "profile_pic_fetch",
        route,
        userId,
      });
    }

    return result;
  },
  inputSchema: FetchUserProfilePicInputSchema,
  outputSchema: FetchUserProfilePicOutputSchema,
  route: ROUTE,
});
