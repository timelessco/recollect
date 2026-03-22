import { NextResponse } from "next/server";

import uniqid from "uniqid";

import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { GET_NAME_FROM_EMAIL_PATTERN, PROFILES } from "@/utils/constants";

import { FetchUserProfileInputSchema, FetchUserProfileOutputSchema } from "./schema";

function getUserNameFromEmail(email: string): null | string {
  if (email) {
    const match = email.match(GET_NAME_FROM_EMAIL_PATTERN);
    return match?.[1]?.replace(".", "-") ?? null;
  }

  return null;
}

const ROUTE = "v2-profiles-fetch-user-profile";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data: profileData, error } = await supabase.from(PROFILES).select("*").eq("id", userId);

    if (error) {
      return apiError({
        error,
        message: "Failed to fetch user profile",
        operation: "profile_fetch",
        route,
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
          error: updateError,
          message: "Failed to update profile picture",
          operation: "profile_pic_update",
          route,
          userId,
        });
      }

      return updated;
    }

    async function assignUsername(email: string) {
      const newUsername = getUserNameFromEmail(email);
      if (!newUsername) {
        return null;
      }

      const { data: existingUsers, error: checkError } = await supabase
        .from(PROFILES)
        .select("user_name")
        .eq("user_name", newUsername);

      if (checkError) {
        return apiError({
          error: checkError,
          message: "Failed to check username availability",
          operation: "username_check",
          route,
          userId,
        });
      }

      const usernameToSet =
        existingUsers && existingUsers.length > 0 ? `${newUsername}-${uniqid.time()}` : newUsername;

      const { data: usernameData, error: usernameError } = await supabase
        .from(PROFILES)
        .update({ user_name: usernameToSet })
        .match({ id: userId })
        .select("*");

      if (usernameError) {
        return apiError({
          error: usernameError,
          message: "Failed to update username",
          operation: "username_update",
          route,
          userId,
        });
      }

      return usernameData;
    }

    const picResult =
      !profile.profile_pic && data.avatar ? await syncProfilePic(data.avatar) : null;
    if (picResult instanceof NextResponse) {
      return picResult;
    }

    const usernameResult =
      profile.user_name === null && profile.email ? await assignUsername(profile.email) : null;
    if (usernameResult instanceof NextResponse) {
      return usernameResult;
    }

    return usernameResult ?? picResult ?? profileData;
  },
  inputSchema: FetchUserProfileInputSchema,
  outputSchema: FetchUserProfileOutputSchema,
  route: ROUTE,
});
