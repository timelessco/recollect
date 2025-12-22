// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import { tagCategoryNameSchema } from "../../../lib/validation/tag-category-schema";
import {
	type NextApiRequest,
	type UserTagsData,
} from "../../../types/apiTypes";
import { TAG_TABLE_NAME } from "../../../utils/constants";
import {
	apiSupabaseClient,
	getApiSupabaseUser,
} from "../../../utils/supabaseServerClient";

type DataResponse = UserTagsData[] | null;
type ErrorResponse =
	| PostgrestError
	| VerifyErrors
	| string
	| { message: string }
	| null;

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

	// Check for auth errors
	const { data: userData, error: userError } = await getApiSupabaseUser(
		request,
		supabase,
	);
	const userId = userData?.user?.id;

	if (userError || !userId) {
		console.warn("User authentication failed:", {
			error: userError?.message,
		});
		response.status(401).json({
			data: null,
			error: { message: "Unauthorized" },
		});
		return;
	}

	const result = tagCategoryNameSchema.safeParse(request?.body?.name);

	if (!result.success) {
		const errorMessage = result.error.issues[0]?.message ?? "Invalid tag name";
		response.status(400).json({
			data: null,
			error: { message: errorMessage },
		});
		return;
	}

	// Already trimmed by Zod
	const trimmedName = result.data;

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
