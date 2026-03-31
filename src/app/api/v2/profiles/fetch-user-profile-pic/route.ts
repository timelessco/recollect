import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { FetchUserProfilePicInputSchema, FetchUserProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-profiles-fetch-user-profile-pic";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: result, error } = await supabase
        .from(PROFILES)
        .select("profile_pic")
        .eq("email", data.email);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch user profile picture",
          operation: "profile_pic_fetch",
        });
      }

      if (ctx?.fields) {
        ctx.fields.has_profile_pic = result.length > 0 && result[0].profile_pic !== null;
      }

      return result;
    },
    inputSchema: FetchUserProfilePicInputSchema,
    outputSchema: FetchUserProfilePicOutputSchema,
    route: ROUTE,
  }),
);
