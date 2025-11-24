import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";

import { PDF_MIME_TYPE } from "../../../../../utils/constants";

const querySchema = z.object({
	url: z.url("Invalid URL format"),
});

// this api is used to get the pdf buffer from the url
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const parseResult = querySchema.safeParse(request.query);
	if (!parseResult.success) {
		response.status(400).json({ error: parseResult.error.issues });
		return;
	}

	const { url: pdfUrl } = parseResult.data;

	try {
		const result = await fetch(pdfUrl);

		if (!result.ok) {
			throw new Error("Failed to fetch PDF");
		}

		const buffer = await result.arrayBuffer();

		response.setHeader("Content-Type", PDF_MIME_TYPE);
		response.send(Buffer.from(buffer));
	} catch {
		response.status(500).json({ error: "Failed to fetch PDF" });
	}
}
