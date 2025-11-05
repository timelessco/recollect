/* eslint-disable no-console */
import { type NextApiRequest, type NextApiResponse } from "next";

import { createServiceClient } from "../../../../utils/supabaseClient";

import { processImageQueue } from "./worker";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const supabase = createServiceClient();

	try {
		const result = await processImageQueue(supabase, {
			queueName: "ai-embeddings",
			batchSize: 1,
		});

		console.log(`Queue Id: ${result?.messageId} processed successfully`);

		response.status(200).json({
			success: true,
			message: `Queue Id: ${result?.messageId} processed successfully`,
		});
	} catch {
		response
			.status(500)
			.json({ success: false, error: "Error processing queue" });
	}
}
