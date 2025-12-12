// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	type NextApiRequest,
	type UserTagsData,
} from "../../../types/apiTypes";
import {
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
	TAG_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// Creates tags for a specific user

export default async function handler(
	request: NextApiRequest<{
		name: string;
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;
	const rawName = request?.body?.name;
	const trimmedName = typeof rawName === "string" ? rawName.trim() : "";

	if (
		typeof rawName !== "string" ||
		trimmedName.length < MIN_TAG_COLLECTION_NAME_LENGTH ||
		trimmedName.length > MAX_TAG_COLLECTION_NAME_LENGTH
	) {
		response.status(400).json({
			data: null,
			error: `Tag name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
		});
		return;
	}

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(TAG_TABLE_NAME)
			.insert([
				{
					name: trimmedName,
					user_id: userId,
				},
			])
			.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		Sentry.captureException(`create tag error : ${error?.message}`);
	}
}
