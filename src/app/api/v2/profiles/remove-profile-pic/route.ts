import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { deleteProfilePic } from "./delete-logic";
import { RemoveProfilePicInputSchema, RemoveProfilePicOutputSchema } from "./schema";

const ROUTE = "v2-profiles-remove-profile-pic";

export const DELETE = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: removeData, error: removeError } = await supabase
        .from(PROFILES)
        .update({ profile_pic: null })
        .match({ id: userId })
        .select("profile_pic");

      if (removeError) {
        throw new RecollectApiError("service_unavailable", {
          cause: removeError,
          message: "Failed to remove profile picture",
          operation: "profile_pic_db_remove",
        });
      }

      await deleteProfilePic({ userId });

      if (ctx?.fields) {
        ctx.fields.profile_pic_removed = true;
      }

      return removeData;
    },
    inputSchema: RemoveProfilePicInputSchema,
    outputSchema: RemoveProfilePicOutputSchema,
    route: ROUTE,
  }),
);
