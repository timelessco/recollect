import slugify from "slugify";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { UpdateUsernameInputSchema, UpdateUsernameOutputSchema } from "./schema";

const ROUTE = "v2-profiles-update-username";

export const PATCH = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const username = slugify(data.username, { lower: true, strict: true });

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { username_length: username.length });

      const { data: checkData, error: checkError } = await supabase
        .from(PROFILES)
        .select("user_name")
        .eq("user_name", username);

      if (checkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: checkError,
          message: "Failed to check username availability",
          operation: "username_check",
        });
      }

      if (checkData.length > 0) {
        throw new RecollectApiError("conflict", {
          message: "Username already exists, please try another username",
        });
      }

      const { data: updateData, error: updateError } = await supabase
        .from(PROFILES)
        .update({ user_name: username })
        .match({ id: userId })
        .select("user_name");

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to update username",
          operation: "username_update",
        });
      }

      setPayload(ctx, { username_updated: true });

      return updateData;
    },
    inputSchema: UpdateUsernameInputSchema,
    outputSchema: UpdateUsernameOutputSchema,
    route: ROUTE,
  }),
);
