import { type NextApiRequest, type NextApiResponse } from "next";

import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "DELETE") {
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
			.update({ api_key: null })
			.eq("id", userId);

		if (ErrorResponse) {
			console.error(ErrorResponse);
			response.status(500).json({ error: "Failed to delete API key" });
			return;
		}

		response.status(200).json({
			message: "API key deleted successfully",
			data: DataResponse,
		});
	} catch (error) {
		console.error(error);
		response.status(500).json({ error: "Internal server error" });
	}
}
