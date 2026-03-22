import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { CheckGeminiApiKeyInputSchema, CheckGeminiApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-profiles-check-gemini-api-key";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const { data: profileData, error: profileError } = await supabase
      .from(PROFILES)
      .select("api_key")
      .eq("id", userId)
      .single();

    if (profileError) {
      return apiError({
        error: profileError,
        message: "Failed to check API key status",
        operation: "gemini_api_key_check",
        route,
        userId,
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
