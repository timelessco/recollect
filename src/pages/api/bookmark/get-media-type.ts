import { type NextApiRequest, type NextApiResponse } from "next";
import axios from "axios";

// in this api we get the url from the request body and then we check the media type of the url
// this is used in checkIfUrlAnMedia and checkIfUrlAnImage functions in the helpers
// this api returns the media type of the url
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	response.setHeader("Access-Control-Allow-Origin", "*");
	response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	response.setHeader("Access-Control-Allow-Headers", "Content-Type");

	const { url } = request.body;

	if (!url || typeof url !== "string") {
		response.status(400).json({
			error: "URL parameter is required",
		});
		return;
	}

	try {
		const result = await axios.head(url, {
			timeout: 5_000,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
		});

		const mediaType = result.headers["content-type"];

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
