import uniqid from "uniqid";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
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

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: profileData, error } = await supabase
        .from(PROFILES)
        .select("*")
        .eq("id", userId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch user profile",
          operation: "profile_fetch",
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
          throw new RecollectApiError("service_unavailable", {
            cause: updateError,
            message: "Failed to update profile picture",
            operation: "profile_pic_update",
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
          throw new RecollectApiError("service_unavailable", {
            cause: checkError,
            message: "Failed to check username availability",
            operation: "username_check",
          });
        }

        const usernameToSet =
          existingUsers && existingUsers.length > 0
            ? `${newUsername}-${uniqid.time()}`
            : newUsername;

        const { data: usernameData, error: usernameError } = await supabase
          .from(PROFILES)
          .update({ user_name: usernameToSet })
          .match({ id: userId })
          .select("*");

        if (usernameError) {
          throw new RecollectApiError("service_unavailable", {
            cause: usernameError,
            message: "Failed to update username",
            operation: "username_update",
          });
        }

        return usernameData;
      }

      const picResult =
        !profile.profile_pic && data.avatar ? await syncProfilePic(data.avatar) : null;

      const usernameResult =
        profile.user_name === null && profile.email ? await assignUsername(profile.email) : null;

      setPayload(ctx, {
        synced_profile_pic: Boolean(picResult),
        assigned_username: Boolean(usernameResult),
      });

      return usernameResult ?? picResult ?? profileData;
    },
    inputSchema: FetchUserProfileInputSchema,
    outputSchema: FetchUserProfileOutputSchema,
    route: ROUTE,
  }),
);
