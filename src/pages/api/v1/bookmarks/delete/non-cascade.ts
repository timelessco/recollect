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
	error: string | null;
	success: boolean;
};

const getBodySchema = () =>
	z.object({
		data: z.object({
			id: z.number(),
		}),
	});

/**
 * This api only deletes the bookmark and not all the forgin keys data or s3 bucket data. This is used on test cases
 *
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request.method !== "DELETE") {
		response
			.status(405)
			.send({ error: "Only DELETE requests allowed", success: false });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.body);
		const supabase = apiSupabaseClient(request, response);

		const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

		const { error } = await supabase
			.from(MAIN_TABLE_NAME)
			.delete()
			.eq("user_id", userId)
			.eq("id", bodyData?.data?.id);

		if (error) {
			response.status(500).send({ error: "fetch error", success: false });
			Sentry.captureException(`fetch error`);
			return;
		}

		response.status(200).send({ error: null, success: true });
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
