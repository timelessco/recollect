import { type NextApiRequest, type NextApiResponse } from "next";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const supabase = apiSupabaseClient(request, response);

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		response.status(401).json({ error: "Unauthorized user" });
		return;
	}

	const userId = user.id;

	try {
		const { data: DataResponse, error: ErrorResponse } = await supabase
			.from(PROFILES)
			.select("api_key")
			.eq("id", userId)
			.single();

		const hasApiKey = Boolean(DataResponse?.api_key);

		let apiKey: string | null = null;

		if (hasApiKey) {
			const decryptedBytes = CryptoJS.AES.decrypt(
				DataResponse?.api_key ?? "",
				process.env.API_KEY_ENCRYPTION_KEY as string,
			);
			apiKey = decryptedBytes.toString(CryptoJS.enc.Utf8);
		}

		if (ErrorResponse) {
			console.error(ErrorResponse);
			response.status(500).json({ error: "Database error" });
			return;
		}

		response.status(200).json({
			message: "API key checked successfully",
			data: { hasApiKey, apiKey },
		});
	} catch (error) {
		console.error(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
