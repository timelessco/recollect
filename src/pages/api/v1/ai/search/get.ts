import { type NextApiRequest, type NextApiResponse } from "next";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";
import { find } from "lodash";
import { z } from "zod";

import { type SingleListData } from "../../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

type FinalReturnDataType = Array<SingleListData & { score: number }>;

const getBodySchema = () =>
	z.object({
		query: z.string()?.nonempty(),
	});

const getDataFromMainDatabase = async (
	supabase: SupabaseClient,
	bookmarkIds: Array<SingleListData["id"]>,
) => {
	const userId = (await supabase.auth.getUser())?.data?.user?.id;
	const { data, error } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("*")
		.eq("user_id", userId)
		.in("id", bookmarkIds);

	return { data, error };
};

/**
 * Gets the search results based on query string from vector DB
 *
 * @param request
 * @param response
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<{
		data: FinalReturnDataType | null;
		error: string | null;
	}>,
) {
	if (request.method !== "GET") {
		response
			.status(405)
			.send({ error: "Only GET requests allowed", data: null });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.query);

		const client = apiSupabaseClient(request, response);

		const userData = await client?.auth?.getUser();

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
			// make the vector call from the vector store
			const answer = await vectorStore.similaritySearchWithScore(
				bodyData?.query,
				500,
				{ user_id: userData?.data?.user?.id },
			);

			// get the bookmarks from the vector search that are in the main table.
			// get all the boomarkids from the vector search
			const bookmarkIds = answer?.map(
				(item) => item?.[0]?.metadata?.bookmark_id,
			);

			// get all the bookmarks from the main table
			const { data, error } = await getDataFromMainDatabase(
				client,
				bookmarkIds,
			);

			// NOTE: no empty data check as this is search results , the data can be empty based on the user query

			if (error) {
				Sentry.captureException(`Main table fetch error: ${error?.message}`);
				response.status(400).send({
					error: `Main table fetch error: ${error?.message}`,
					data: null,
				});

				return;
			}

			// we map the similarity score with the data got from the main table, so that we can render the relevance order in the font end
			const bookmarkIdsWithScoreFromVectorDatabase = answer?.map((item) => ({
				id: item?.[0]?.metadata?.bookmark_id,
				score: item?.[1],
			}));

			const dataFromMainTableMappedWithScore = data?.map((item) => {
				const score = find(
					bookmarkIdsWithScoreFromVectorDatabase,
					(vectorItem) => vectorItem?.id === item?.id,
				)?.score;
				return {
					// id: item?.id,
					...item,
					score,
				};
			});

			// we sort this decending based on score, so that we have the highest relevance first
			const sortedDataFromMainTableMappedWithScore =
				dataFromMainTableMappedWithScore?.sort(
					(a, b) => b.score - a.score,
				) as FinalReturnDataType;

			// only have the data where score is greater than a certain number
			const filteredsSortedDataFromMainTableMappedWithScore =
				sortedDataFromMainTableMappedWithScore?.filter((item) => {
					if (item?.score > 0.5) {
						return item;
					}

					return null;
				});

			response.status(200).send({
				error: null,
				data: filteredsSortedDataFromMainTableMappedWithScore,
			});
		} catch (error_) {
			Sentry.captureException(`Error during vector search: ${error_}`);
			response.status(400).send({ error: error_ as string, data: null });
		}
	} catch {
		response.status(400).send({ error: "Error in payload data", data: null });
	}
}
