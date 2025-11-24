import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ data: null, error: "Method not allowed" });
		return;
	}

	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({ data: null, error: "Unauthorized" });
			return;
		}

		console.log("get-gemini-api-key API called:", { userId });

		// Get API key from database
		const { data: profileData, error: profileError } = await supabase
			.from(PROFILES)
			.select("api_key")
			.eq("id", userId)
			.single();

		if (profileError) {
			console.error("Error fetching API key:", profileError);
			Sentry.captureException(profileError, {
				tags: {
					operation: "get_gemini_api_key_fetch",
					userId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to retrieve API key",
			});
			return;
		}

		const hasApiKey = Boolean(profileData?.api_key);

		if (!hasApiKey) {
			console.warn("No API key found");

			response.status(404).json({
				data: null,
				error: "No API key found",
			});
			return;
		}

		// Decrypt API key
		try {
			const decryptedBytes = CryptoJS.AES.decrypt(
				profileData.api_key,
				process.env.API_KEY_ENCRYPTION_KEY as string,
			);
			const apiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);

			// Validate decryption result is not empty
			if (!apiKey) {
				console.error("Decryption produced empty result");
				Sentry.captureMessage("API key decryption returned empty string", {
					level: "warning",
					tags: { operation: "get_gemini_api_key_decrypt", userId },
				});
				response.status(500).json({
					data: null,
					error: "Failed to process API key",
				});
				return;
			}

			console.log("API key retrieved successfully", {
				hasApiKey: Boolean(apiKey),
			});

			response.status(200).json({
				data: {
					apiKey,
				},
				error: null,
			});
		} catch (decryptError) {
			console.error("Error decrypting API key:", decryptError);
			Sentry.captureException(decryptError, {
				tags: {
					operation: "get_gemini_api_key_decrypt",
					userId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to process API key",
			});
		}
	} catch (error) {
		console.error("Unexpected error in get-gemini-api-key:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "get_gemini_api_key_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
