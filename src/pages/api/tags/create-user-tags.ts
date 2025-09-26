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
import { TAG_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// creats tags for a specific user

export default async function handler(
	request: NextApiRequest<{
		name: string;
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;
	console.log(request.body);

	const { name } = request.body;

	// 1. Check if tag already exists for this user
	const { data: existingTags, error: existingTagsError } = await supabase
		.from(TAG_TABLE_NAME)
		.select("id")
		.eq("user_id", userId)
		.eq("name", name);

	if (existingTagsError) {
		Sentry.captureException(existingTagsError);
		response.status(500).json({
			data: null,
			error: "Database error while checking tag",
		});
		return;
	}

	if (existingTags && existingTags.length > 0) {
		response.status(500).json({
			data: null,
			error: "Tag already exists",
		});
		return;
	}

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(TAG_TABLE_NAME)
			.insert([
				{
					name,
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
