import { type NextApiResponse } from "next";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../../../types/apiTypes";
import {
	DOCUMENTS_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

type RequestType = {
	bookmark_ids: Array<SingleListData["id"]>;
};

type ResponseType = {
	error: string | null;
	success: boolean;
};

const getBodySchema = () =>
	z.object({
		bookmark_ids: z.array(z.number()),
	});

/**
 * Adds embeddings based on the bookmark_id to supabase vector store based
 *
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request?.method !== "POST") {
		response
			.status(405)
			.send({ error: "Only POST requests allowed", success: false });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.body);

		const supabase = apiSupabaseClient(request, response);

		// get the bookmarks
		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("title, description, type, url, user_id, id, meta_data")
			.in("id", bodyData?.bookmark_ids);

		if (isEmpty(data)) {
			response.status(400).send({ error: "Empty data", success: false });

			Sentry.captureException(`Empty data`);
			return;
		}

		if (error) {
			response.status(400).send({ error: error?.message, success: false });

			Sentry.captureException(`Error: ${error?.message}`);
			return;
		}

		// generate embeddings doc
		const embeddingsDocument = data?.map(
			(item) =>
				new Document({
					pageContent: JSON.stringify(item),
					metadata: {
						bookmark_id: item?.id,
						user_id: item?.user_id,
						image_caption: item?.meta_data?.imageCaption || null,
					},
				}),
		);

		// add the doc to supabase vector store
		const embeddings = new GoogleGenerativeAIEmbeddings({
			model: "embedding-001",
			apiKey: process.env.GOOGLE_GEMINI_TOKEN,
		});

		try {
			await SupabaseVectorStore.fromDocuments(embeddingsDocument, embeddings, {
				client: supabase,
				tableName: DOCUMENTS_TABLE_NAME,
			});

			response.status(200).send({ error: null, success: true });
		} catch {
			response
				.status(200)
				.send({ error: "Error when adding to vector store", success: false });
		}
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
