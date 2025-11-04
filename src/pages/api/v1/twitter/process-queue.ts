/* eslint-disable no-console */
import { type NextApiRequest, type NextApiResponse } from "next";
import axios from "axios";

import { getBaseUrl } from "../../../../utils/constants";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	try {
		const apiUrl = `${getBaseUrl()}/api/v1/twitter/ai-embeddings`;

		const response_ = axios.get(apiUrl);

		console.log("Queue Trigger Response:");

		response.status(200).json({
			success: true,
			message: "Queue processing triggered successfully",
		});
	} catch {
		console.error("Failed to trigger queue:");
		response.status(500).json({
			success: false,
			error: "Failed to trigger queue",
		});
	}
}
