import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

type RequestType = {
	data: Pick<SingleListData, "id">;
};

type ResponseType = {
	data: SingleListData[] | null;
	error: string | null;
};

const getBodySchema = () =>
	z.object({
		id: z.string(),
	});

/**
 * This api fetches bookmark by its id
 *
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
/**
 * This api fetches bookmark by its id
 *
 * @param {NextApiRequest<RequestType>} request - Request object
 * @param {NextApiResponse<ResponseType>} response - Response object
 * @returns {Promise<NextApiResponse<ResponseType>>} - Fetched bookmark or error
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
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
		const supabase = apiSupabaseClient(request, response);

		const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.eq("user_id", userId)
			.eq("id", Number.parseInt(bodyData?.id, 10));

		if (error) {
			response.status(500).send({ error: "fetch error", data: null });
			Sentry.captureException(`fetch error`);
			return;
		}

		response.status(200).send({ error: null, data });
	} catch {
		response.status(400).send({ error: "Error in payload data", data: null });
	}
}
