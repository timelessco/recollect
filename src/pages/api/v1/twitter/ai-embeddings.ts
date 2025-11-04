/* eslint-disable no-console */
import { type NextApiRequest, type NextApiResponse } from "next";

import { createServiceClient } from "../../../../utils/supabaseClient";

import { processImageQueue } from "./worker";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const supabase = createServiceClient();

	try {
		const result = processImageQueue(
			supabase,
			{
				queueName: "ai-embeddings",
				batchSize: 1,
			},
			true,
		);

		console.log({
			message: `Queue processed successfully `,
		});

		response.status(200).json({
			success: true,
			message: "Queue processed successfully",
		});
	} catch {
		response.status(500).json({
			success: false,
			error: "Error processing queue",
		});
	}
}
