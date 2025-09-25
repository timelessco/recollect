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
		const result = await processImageQueue(supabase, {
			processOcr: true,
			processCaption: false,
			processBlurhash: false,
			queueName: "ai-stuffs",
			batchSize: 50,
		});
		console.log({
			message: `Queue processed successfully from ${result?.messageId} to ${result?.messageEndId}`,
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
