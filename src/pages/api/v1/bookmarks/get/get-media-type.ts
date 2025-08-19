import { type NextApiRequest, type NextApiResponse } from "next";
import axios from "axios";
import { z } from "zod";

const schema = z.object({
	url: z.string().url({ message: "Invalid URL format" }),
});
// in this api we get the url from the request body and then we check the media type of the url
// this is used in checkIfUrlAnMedia and checkIfUrlAnImage functions in the helpers
// this api returns the media type of the url
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({
			error: "Only POST requests allowed",
		});
		return;
	}

	const parseResult = schema.safeParse(request.body);

	if (!parseResult.success) {
		response.status(400).json({
			error: parseResult.error.errors[0]?.message ?? "Invalid input",
		});
		return;
	}

	const { url } = parseResult.data;

	try {
		const result = await axios.head(url, {
			timeout: 5_000,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
		});

		const mediaType = result.headers["content-type"];
		response.setHeader("Access-Control-Allow-Origin", "*");
		response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		response.setHeader("Access-Control-Allow-Headers", "Content-Type");

		response.status(200).json({
			mediaType,
		});
	} catch (error) {
		console.error("Error checking media type:", error);

		response.status(500).json({
			error: "Failed to check media type",
		});
	}
}
