import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
	type twitter_sort_index,
} from "../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

type RequestType = { urls: string };
type ResponseType = {
	data: Array<{
		sort_index: twitter_sort_index;
		url: SingleListData["url"];
	}> | null;
	error: string | null;
};

const getBodySchema = () =>
	z.object({
		urls: z.array(z.string()),
	});

/**
 * Gets sort index based on urls
 *
 * @param {RequestType} request
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request.method !== "GET") {
		response
			.status(405)
			.send({ error: "Only GET requests allowed", data: null });
	}

	try {
		const schema = getBodySchema();
		const queryData = schema.parse({
			urls: JSON.parse(request?.query?.urls as string),
		});

		const supabase = apiSupabaseClient(request, response);
		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("sort_index, url")
			.in("url", queryData?.urls);

		if (error) {
			response.status(400).send({ error: "Error in payload data", data: null });
			Sentry.captureException(`DB error: ${error?.message}`);
			return;
		}

		response.status(200).send({ error: null, data });
	} catch {
		response.status(400).send({ error: "Error in payload data", data: null });
	}
}
