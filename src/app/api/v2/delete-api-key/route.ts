import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { DeleteApiKeyInputSchema, DeleteApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-delete-api-key";

export const DELETE = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      // Entity IDs BEFORE the operation
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { error: updateError } = await supabase
        .from(PROFILES)
        .update({ api_key: null })
        .eq("id", userId);

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to delete API key",
          operation: "api_key_delete",
        });
      }

      // Outcome flag AFTER the operation
      if (ctx?.fields) {
        ctx.fields.key_deleted = true;
      }

      return { success: true };
    },
    inputSchema: DeleteApiKeyInputSchema,
    outputSchema: DeleteApiKeyOutputSchema,
    route: ROUTE,
  }),
);
