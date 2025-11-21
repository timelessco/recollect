import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
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

		console.log("check-gemini-api-key API called:", { userId });

		// Check if API key exists
		const { data: profileData, error: profileError } = await supabase
			.from(PROFILES)
			.select("api_key")
			.eq("id", userId)
			.single();

		if (profileError) {
			console.error("Error checking API key:", profileError);
			Sentry.captureException(profileError, {
				tags: {
					operation: "check_api_key_fetch",
					userId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Failed to check API key status",
			});
			return;
		}

		const hasApiKey = Boolean(profileData?.api_key);

		console.log("API key check completed", {
			hasApiKey,
			userId,
		});

		response.status(200).json({
			data: { hasApiKey },
			error: null,
		});
	} catch (error) {
		console.error("Unexpected error in check-gemini-api-key:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "check_gemini_api_key_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
