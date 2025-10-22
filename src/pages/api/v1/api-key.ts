import { type NextApiRequest, type NextApiResponse } from "next";
import Cryptr from "cryptr";
import { z } from "zod";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

const bodySchema = z.object({
	apikey: z
		.string({
			required_error: "API key is required",
			invalid_type_error: "API key must be a string",
		})
		.optional(),
});

const cryptr = new Cryptr(process.env.SECRET_KEY as string);
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
			details: parsed.error.errors.map((error) => error.message),
		});
		return;
	}

	const { apikey } = parsed.data;
	const userId = user.id;

	const encryptedApiKey = cryptr.encrypt(apikey ?? "");

	try {
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
		return;
	} catch (error) {
		console.error(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
