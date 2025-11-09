import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { type NextApiRequest } from "../../../../../types/apiTypes";
import { PROFILES } from "../../../../../utils/constants";
import { createServiceClient } from "../../../../../utils/supabaseClient";

type RequestType = {
	email: string;
};

type ResponseType = {
	error: string | null;
	provider: string | null;
};

const getBodySchema = () =>
	z.object({
		email: z.string().email(),
	});

/**
 * This api fetches the user provider
 * This api does is used outside auth flow
 * @param {NextApiRequest<RequestType>} request
 * @param {NextApiResponse<ResponseType>} response
 * @returns {ResponseType}
 */
export default async function handler(
	request: NextApiRequest<RequestType>,
	response: NextApiResponse<ResponseType>,
) {
	if (request.method !== "GET") {
		response
			.status(405)
			.send({ error: "Only GET requests allowed", provider: null });
		return;
	}

	try {
		const schema = getBodySchema();
		const bodyData = schema.parse(request.query);
		const supabase = createServiceClient();

		const { data, error } = await supabase
			.from(PROFILES)
			.select("provider")
			.eq("email", bodyData?.email);

		if (error) {
			response.status(500).send({ error: "fetch error", provider: null });
			Sentry.captureException(`fetch error`);
			return;
		}

		response
			.status(200)
			.send({ error: null, provider: data?.[0]?.provider || null });
	} catch {
		response
			.status(400)
			.send({ error: "Error in payload data", provider: null });
	}
}
