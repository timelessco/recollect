/* eslint-disable no-console */
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import { insertEmbeddings } from "../../../../async/supabaseCrudHelpers/ai/embeddings";
import {
	type NextApiRequest,
	type SingleListData,
	type twitter_sort_index,
} from "../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

type RequestType = {
	data: Array<
		Pick<SingleListData, "description" | "ogImage" | "title" | "type" | "url">
	> & { sort_index: twitter_sort_index };
};

const getBodySchema = () =>
	z.object({
		data: z.array(
			z.object({
				description: z.string(),
				ogImage: z.string().nullable(),
				title: z.string(),
				type: z.string(),
				url: z.string(),
				meta_data: z.object({
					twitter_avatar_url: z.string().optional(),
					favIcon: z.string(),
				}),
				inserted_at: z.string().datetime().optional(),
				sort_index: z.string(),
				category_name: z.string().optional(),
			}),
		),
	});

type ResponseType = {
	data?: SingleListData[];
	error: string | null;
	success: boolean;
};

/**
 * Inserts the twitter data into the DB
 *
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request.method !== "POST") {
		response
			.status(405)
			.send({ error: "Only POST requests allowed", success: false });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.body);
		const supabase = apiSupabaseClient(request, response);

		const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

		// adding user_id in the data to be inserted
		const insertData = bodyData?.data?.map((item) => ({
			...item,
			user_id: userId,
		}));

		// get the urls who are tweets present in table, we fetch only the urls there are there in the insertData for the query optimization
		const { data: duplicateCheckData, error: duplicateCheckError } =
			await supabase
				.from(MAIN_TABLE_NAME)
				.select("url")
				// get only the urls that are there in the payload
				.in("url", insertData?.map((item) => item?.url))
				.eq("user_id", userId)
				.eq("type", "tweet");

		if (duplicateCheckError) {
			response.status(400).send({
				error: `DB duplicateCheckError: ${duplicateCheckError?.message}`,
				success: false,
			});

			Sentry.captureException(
				`DB duplicateCheckError: ${duplicateCheckError?.message}`,
			);
			return;
		}

		// filter out the duplicates from the payload data
		const duplicateFilteredData = insertData?.filter(
			(item) =>
				!duplicateCheckData
					?.map((duplicateCheckItem) => duplicateCheckItem?.url)
					?.includes(item?.url),
		);

		// NOTE: Upsert does not work here as the url is not unique and cannot be unique

		// adding the data in DB
		const { data: insertDBData, error: insertDBError } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(duplicateFilteredData)
			.select("*");

		if (insertDBError) {
			response
				.status(400)
				.send({ error: `DB error: ${insertDBError?.message}`, success: false });

			Sentry.captureException(`DB error: ${insertDBError?.message}`);
			return;
		}

		if (isEmpty(insertDBData)) {
			response
				.status(400)
				.send({ error: "Empty data after insertion", success: false });

			Sentry.captureException(`Empty data after insertion`);

			return;
		}

		try {
			const { data: queueResults, error: queueResultsError } = await supabase
				.schema("pgmq_public")
				.rpc("send_batch", {
					queue_name: "ai-stuffs",
					messages: insertDBData,
					sleep_seconds: 0,
				});

			await supabase.schema("pgmq_public").rpc("send_batch", {
				queue_name: "blurhash",
				messages: insertDBData,
				sleep_seconds: 0,
			});

			await supabase.schema("pgmq_public").rpc("send_batch", {
				queue_name: "image-caption",
				messages: insertDBData,
				sleep_seconds: 0,
			});

			if (!queueResultsError) {
				console.log("successfully queued ", queueResults.length, "items");
			}
		} catch {
			console.error("Failed to queue item:");
		}

		// // creates and add embeddings
		// const bookmarkIds = insertDBData?.map((item) => item?.id);

		// try {
		// 	await insertEmbeddings(bookmarkIds, request?.cookies);
		// } catch {
		// 	console.error("Create embeddings error in twitter sync api");
		// 	Sentry.captureException(`Create embeddings error in twitter sync api`);
		// }

		response.status(200).json({ success: true, error: null });
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
