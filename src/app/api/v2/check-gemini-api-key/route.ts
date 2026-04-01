import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { CheckGeminiApiKeyInputSchema, CheckGeminiApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-profiles-check-gemini-api-key";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: profileData, error: profileError } = await supabase
        .from(PROFILES)
        .select("api_key")
        .eq("id", userId)
        .single();

      if (profileError) {
        throw new RecollectApiError("service_unavailable", {
          cause: profileError,
          message: "Failed to check API key status",
          operation: "gemini_api_key_check",
        });
      }

      const hasApiKey = Boolean(profileData?.api_key);

      if (ctx?.fields) {
        ctx.fields.has_api_key = hasApiKey;
      }

      return { hasApiKey };
    },
    inputSchema: CheckGeminiApiKeyInputSchema,
    outputSchema: CheckGeminiApiKeyOutputSchema,
    route: ROUTE,
  }),
);
