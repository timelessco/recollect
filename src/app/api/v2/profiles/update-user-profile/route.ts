import type { Database } from "@/types/database.types";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import { UpdateUserProfileInputSchema, UpdateUserProfileOutputSchema } from "./schema";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const ROUTE = "v2-profiles-update-user-profile";

export const PATCH = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const updatePayload = toDbType<ProfileUpdate>(data.updateData);

      const { data: profileData, error } = await supabase
        .from(PROFILES)
        .update(updatePayload)
        .match({ id: userId })
        .select();

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to update profile",
          operation: "profile_update",
        });
      }

      if (!profileData || profileData.length === 0) {
        throw new RecollectApiError("not_found", {
          message: "Profile not found",
        });
      }

      setPayload(ctx, { profile_updated: true });

      return profileData;
    },
    inputSchema: UpdateUserProfileInputSchema,
    outputSchema: UpdateUserProfileOutputSchema,
    route: ROUTE,
  }),
);
