import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../../utils/constants";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

type RequestType = {
	data: Array<
		Pick<SingleListData, "description" | "ogImage" | "title" | "type" | "url">
	>;
};

type ResponseType = {
	error: string | null;
	success: boolean;
};

const getBodySchema = () =>
	z.object({
		data: z.array(
			z.object({
				description: z.string(),
				ogImage: z.string(),
				title: z.string(),
				type: z.string(),
				url: z.string(),
			}),
		),
	});

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

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(bodyData)
			.match({ user_id: userId })
			.select("id");

		if (isEmpty(data)) {
			response
				.status(400)
				.send({ error: "Empty data after insertion", success: false });

			Sentry.captureException(`Empty data after insertion`);

			return;
		}

		if (error) {
			response
				.status(400)
				.send({ error: `DB error: ${error?.message}`, success: false });

			Sentry.captureException(`DB error: ${error?.message}`);
			return;
		}

		response.status(200).json({ success: true, error: null });
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", success: false });
	}
}
