import { type NextApiRequest, type NextApiResponse } from "next";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { z } from "zod";

import { createServiceClient } from "../../../../../utils/supabaseClient";

const getBodySchema = () =>
	z.object({
		query: z.string(),
	});

/**
 * Gets the search results based on query string from vector DB
 *
 * @param request
 * @param response
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "GET") {
		response
			.status(405)
			.send({ error: "Only GET requests allowed", success: false });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.query);

		const client = createServiceClient();

		// get the vector store
		const embeddings = new GoogleGenerativeAIEmbeddings({
			model: "embedding-001",
			apiKey: process.env.GOOGLE_GEMINI_TOKEN,
		});

		const vectorStore = new SupabaseVectorStore(embeddings, {
			client,
			tableName: "documents",
		});

		try {
			const answer = await vectorStore.similaritySearchWithScore(
				bodyData?.query,
				4_000,
			);

			response.status(200).send({ error: false, data: answer });
		} catch (error_) {
			response.status(400).send({ error: error_, success: false });
		}
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
