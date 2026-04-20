import CryptoJS from "crypto-js";

import { env } from "@/env/server";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { ApiKeyInputSchema, ApiKeyOutputSchema } from "./schema";
import { validateApiKey } from "./validate-api-key";

const ROUTE = "v2-api-key";

export const PUT = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { apikey } = data;
      const userId = user.id;

      const encryptionKey = env.API_KEY_ENCRYPTION_KEY;

      if (!encryptionKey) {
        throw new RecollectApiError("service_unavailable", {
          cause: new Error("API_KEY_ENCRYPTION_KEY is not configured"),
          message: "Server configuration error",
          operation: "api_key_encryption_config",
        });
      }

      try {
        await validateApiKey({ apikey });
      } catch (error) {
        throw new RecollectApiError("bad_request", {
          cause: error,
          message: "Invalid API key",
        });
      }

      // Entity IDs BEFORE the operation
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const encryptedApiKey = CryptoJS.AES.encrypt(apikey, encryptionKey).toString();

      const { error: upsertError } = await supabase
        .from(PROFILES)
        .upsert({ api_key: encryptedApiKey, id: userId });

      if (upsertError) {
        throw new RecollectApiError("service_unavailable", {
          cause: upsertError,
          message: "Failed to save API key",
          operation: "api_key_upsert",
        });
      }

      // Outcome flag AFTER the operation
      setPayload(ctx, { key_upserted: true });

      return { success: true };
    },
    inputSchema: ApiKeyInputSchema,
    outputSchema: ApiKeyOutputSchema,
    route: ROUTE,
  }),
);
