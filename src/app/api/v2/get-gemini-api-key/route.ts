import * as Sentry from "@sentry/nextjs";
import CryptoJS from "crypto-js";

import { env } from "@/env/server";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { GetGeminiApiKeyInputSchema, GetGeminiApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-get-gemini-api-key";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
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

    const { data: profileData, error: profileError } = await supabase
      .from(PROFILES)
      .select("api_key")
      .eq("id", userId)
      .single();

    if (profileError) {
      return apiError({
        error: profileError,
        message: "Failed to retrieve API key",
        operation: "get_gemini_api_key_fetch",
        route,
        userId,
      });
    }

    if (!profileData?.api_key) {
      return apiWarn({
        message: "No API key stored",
        route,
        status: 404,
      });
    }

    try {
      const decryptedBytes = CryptoJS.AES.decrypt(profileData.api_key, encryptionKey);
      const apiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!apiKey) {
        Sentry.captureMessage("API key decryption returned empty string", {
          level: "warning",
          tags: { operation: "get_gemini_api_key_decrypt", userId },
        });

        return apiError({
          error: new Error("Decryption produced empty result"),
          message: "Failed to process API key",
          operation: "get_gemini_api_key_decrypt",
          route,
          userId,
        });
      }

      console.log(`[${route}] API key retrieved successfully:`, { userId });

      return { apiKey };
    } catch (decryptError) {
      return apiError({
        error: decryptError,
        message: "Failed to process API key",
        operation: "get_gemini_api_key_decrypt",
        route,
        userId,
      });
    }
  },
  inputSchema: GetGeminiApiKeyInputSchema,
  outputSchema: GetGeminiApiKeyOutputSchema,
  route: ROUTE,
});
