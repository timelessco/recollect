import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
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

	const { apiKey } = await z
		.object({
			apiKey: z.string().nonempty(),
		})
		.parseAsync(request.body);

	try {
		const { data: DataResponse, error: ErrorResponse } = await supabase
			.from(PROFILES)
			.upsert({
				id: userId,
				api_key: apiKey,
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
