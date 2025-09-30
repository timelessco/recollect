// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import isNull from "lodash/isNull";

import {
	type CategoriesData,
	type NextApiRequest,
	type UpdateUserProfileApiPayload,
} from "../../../types/apiTypes";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = CategoriesData[] | null;
type ErrorResponse = PostgrestError | string | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

/**
 * Updates profile for a user
 */

export default async function handler(
	request: NextApiRequest<UpdateUserProfileApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(PROFILES)
			.update(request.body.updateData)
			.match({ id: userId })
			.select();

	if (!isNull(error)) {
		response.status(500).json({
			data: null,
			error: isEmpty(error) ? { message: "Something went wrong" } : error,
		});

		Sentry.captureException(`update error ${error}`);
	} else if (isEmpty(data) || isNull(data)) {
		response
			.status(500)
			.json({ data: null, error: { message: "Something went wrong" } });
		Sentry.captureException(`data is empty`);
	} else {
		response.status(200).json({ data, error: null });
	}
}
