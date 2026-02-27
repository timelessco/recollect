import CryptoJS from "crypto-js";

import { createPutApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import { ApiKeyInputSchema, ApiKeyOutputSchema } from "./schema";
import { validateApiKey } from "./validate-api-key";

const ROUTE = "v2-api-key";

export const PUT = createPutApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: ApiKeyInputSchema,
	outputSchema: ApiKeyOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { apikey } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId });

		const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;

		if (!encryptionKey) {
			return apiError({
				route,
				message: "Server configuration error",
				error: new Error("API_KEY_ENCRYPTION_KEY is not configured"),
				operation: "api_key_encryption_config",
				userId,
			});
		}

		try {
			await validateApiKey({ apikey });
		} catch {
			return apiWarn({
				route,
				message: "Invalid API key",
				status: 400,
			});
		}

		const encryptedApiKey = CryptoJS.AES.encrypt(
			apikey,
			encryptionKey,
		).toString();

		const { error: upsertError } = await supabase
			.from(PROFILES)
			.upsert({ id: userId, api_key: encryptedApiKey });

		if (upsertError) {
			return apiError({
				route,
				message: "Failed to save API key",
				error: upsertError,
				operation: "api_key_upsert",
				userId,
			});
		}

		console.log(`[${route}] API key saved successfully:`, { userId });

		return { success: true };
	},
});
