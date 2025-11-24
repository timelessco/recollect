import { type NextApiRequest, type NextApiResponse } from "next";
import CryptoJS from "crypto-js";
import { z } from "zod";

import { validateApiKey } from "../../../async/supabaseCrudHelpers";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

const bodySchema = z.object({
	apikey: z.string({
		error: "API key is required",
	}),
});

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
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

	const parsed = bodySchema.safeParse(request.body);

	if (!parsed.success) {
		response.status(400).json({
			error: "Invalid request body",
			details: parsed.error.issues.map((issue) => issue.message),
		});
		return;
	}

	const { apikey } = parsed.data;
	const userId = user.id;

	try {
		await validateApiKey(apikey as string);
	} catch (error) {
		console.error(error);
		response.status(400).json({ error: "Invalid API key" });
		return;
	}

	try {
		const encryptedApiKey = CryptoJS.AES.encrypt(
			apikey,
			process.env.API_KEY_ENCRYPTION_KEY,
		).toString();

		const { data: DataResponse, error: ErrorResponse } = await supabase
			.from(PROFILES)
			.upsert({
				id: userId,
				api_key: encryptedApiKey,
			});

		if (ErrorResponse) {
			console.error(ErrorResponse);
			response.status(500).json({ error: "Database error" });
			return;
		}

		response.status(200).json({
			message: "API key saved successfully",
			data: DataResponse,
		});
	} catch (error) {
		console.error(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
