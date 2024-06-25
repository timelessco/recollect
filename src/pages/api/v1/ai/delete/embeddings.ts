import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../../../types/apiTypes";
import { DOCUMENTS_TABLE_NAME } from "../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

type RequestType = {
	bookmark_ids: Array<SingleListData["id"]>;
	delete_user_embeddings?: boolean;
};

type ResponseType = {
	error: string | null;
	success: boolean;
};

const getBodySchema = () =>
	z.object({
		bookmark_ids: z.array(z.number()),
		// if true then all the embeddings for the user will be deleted irrespective of the bookmark_ids sent
		delete_user_embeddings: z.boolean(),
	});

/**
 * Deletes the data from embeddings table based on bookmark_id
 *
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request?.method !== "DELETE") {
		response
			.status(405)
			.send({ error: "Only DELETE requests allowed", success: false });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.body);

		const { bookmark_ids, delete_user_embeddings = false } = bodyData;

		const supabase = apiSupabaseClient(request, response);
		const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

		const deleteFromMetadataLogic = delete_user_embeddings
			? "metadata->>user_id"
			: "metadata->>bookmark_id";

		const deleteFromConditionLogic = delete_user_embeddings
			? [userId]
			: bookmark_ids;

		const { data, error } = await supabase
			.from(DOCUMENTS_TABLE_NAME)
			.delete()
			.in(deleteFromMetadataLogic, deleteFromConditionLogic)
			.select("id");

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

		response.status(200).send({ error: null, success: true });
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
