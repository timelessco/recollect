import CryptoJS from "crypto-js";

import { env } from "@/env/server";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { GetGeminiApiKeyInputSchema, GetGeminiApiKeyOutputSchema } from "./schema";

const ROUTE = "v2-get-gemini-api-key";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const encryptionKey = env.API_KEY_ENCRYPTION_KEY;

      if (!encryptionKey) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("API_KEY_ENCRYPTION_KEY is not configured"),
          message: "Server configuration error",
          operation: "api_key_encryption_config",
        });
      }

      const { data: profileData, error: profileError } = await supabase
        .from(PROFILES)
        .select("api_key")
        .eq("id", userId)
        .single();

      if (profileError) {
        throw new RecollectApiError("service_unavailable", {
          cause: profileError,
          message: "Failed to retrieve API key",
          operation: "get_gemini_api_key_fetch",
        });
      }

      if (!profileData?.api_key) {
        throw new RecollectApiError("not_found", {
          message: "No API key stored",
          operation: "get_gemini_api_key_fetch",
        });
      }

      try {
        const decryptedBytes = CryptoJS.AES.decrypt(profileData.api_key, encryptionKey);
        const apiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (!apiKey) {
          setPayload(ctx, { empty_decryption: true });

          throw new RecollectApiError("service_unavailable", {
            cause: new Error("Decryption produced empty result"),
            message: "Failed to process API key",
            operation: "get_gemini_api_key_decrypt",
          });
        }

        setPayload(ctx, { has_api_key: true });

        return { apiKey };
      } catch (error) {
        if (error instanceof RecollectApiError) {
          throw error;
        }
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to process API key",
          operation: "get_gemini_api_key_decrypt",
        });
      }
    },
    inputSchema: GetGeminiApiKeyInputSchema,
    outputSchema: GetGeminiApiKeyOutputSchema,
    route: ROUTE,
  }),
);
