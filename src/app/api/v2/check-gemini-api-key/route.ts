import { createGetApiHandlerV2WithAuth } from "@/lib/api-helpers/create-handler-v2";
import { PROFILES } from "@/utils/constants";

import { CheckGeminiApiKeyInputSchema, CheckGeminiApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-profiles-check-gemini-api-key";

export const GET = createGetApiHandlerV2WithAuth({
  handler: async ({ error, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data: profileData, error: profileError } = await supabase
      .from(PROFILES)
      .select("api_key")
      .eq("id", userId)
      .single();

    if (profileError) {
      return error({
        cause: profileError,
        message: "Failed to check API key status",
        operation: "gemini_api_key_check",
      });
    }

    const hasApiKey = Boolean(profileData?.api_key);

    console.log(`[${route}] API key check completed:`, { hasApiKey, userId });

    return { hasApiKey };
  },
  inputSchema: CheckGeminiApiKeyInputSchema,
  outputSchema: CheckGeminiApiKeyOutputSchema,
  route: ROUTE,
});
