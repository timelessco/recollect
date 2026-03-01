import * as Sentry from "@sentry/nextjs";
import CryptoJS from "crypto-js";

import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

import {
	GetGeminiApiKeyInputSchema,
	GetGeminiApiKeyOutputSchema,
} from "./schema";

const ROUTE = "v2-get-gemini-api-key";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: GetGeminiApiKeyInputSchema,
	outputSchema: GetGeminiApiKeyOutputSchema,
	handler: async ({ supabase, user, route }) => {
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

		const { data: profileData, error: profileError } = await supabase
			.from(PROFILES)
			.select("api_key")
			.eq("id", userId)
			.single();

		if (profileError) {
			return apiError({
				route,
				message: "Failed to retrieve API key",
				error: profileError,
				operation: "get_gemini_api_key_fetch",
				userId,
			});
		}

		if (!profileData?.api_key) {
			return apiWarn({
				route,
				message: "No API key stored",
				status: 404,
			});
		}

		try {
			const decryptedBytes = CryptoJS.AES.decrypt(
				profileData.api_key,
				encryptionKey,
			);
			const apiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);

			if (!apiKey) {
				Sentry.captureMessage("API key decryption returned empty string", {
					level: "warning",
					tags: { operation: "get_gemini_api_key_decrypt", userId },
				});

				return apiError({
					route,
					message: "Failed to process API key",
					error: new Error("Decryption produced empty result"),
					operation: "get_gemini_api_key_decrypt",
					userId,
				});
			}

			console.log(`[${route}] API key retrieved successfully:`, { userId });

			return { apiKey };
		} catch (decryptError) {
			return apiError({
				route,
				message: "Failed to process API key",
				error: decryptError,
				operation: "get_gemini_api_key_decrypt",
				userId,
			});
		}
	},
});
