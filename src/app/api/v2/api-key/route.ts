import CryptoJS from "crypto-js";

import { env } from "@/env/server";
import { createPutApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { ApiKeyInputSchema, ApiKeyOutputSchema } from "./schema";
import { validateApiKey } from "./validate-api-key";

const ROUTE = "v2-api-key";

export const PUT = createPutApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { apikey } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { userId });

    const encryptionKey = env.API_KEY_ENCRYPTION_KEY;

    if (!encryptionKey) {
      return apiError({
        error: new Error("API_KEY_ENCRYPTION_KEY is not configured"),
        message: "Server configuration error",
        operation: "api_key_encryption_config",
        route,
        userId,
      });
    }

    try {
      await validateApiKey({ apikey });
    } catch {
      return apiWarn({
        message: "Invalid API key",
        route,
        status: 400,
      });
    }

    const encryptedApiKey = CryptoJS.AES.encrypt(apikey, encryptionKey).toString();

    const { error: upsertError } = await supabase
      .from(PROFILES)
      .upsert({ api_key: encryptedApiKey, id: userId });

    if (upsertError) {
      return apiError({
        error: upsertError,
        message: "Failed to save API key",
        operation: "api_key_upsert",
        route,
        userId,
      });
    }

    console.log(`[${route}] API key saved successfully:`, { userId });

    return { success: true };
  },
  inputSchema: ApiKeyInputSchema,
  outputSchema: ApiKeyOutputSchema,
  route: ROUTE,
});
