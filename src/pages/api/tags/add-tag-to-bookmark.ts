// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isNull from "lodash/isNull";

import {
	type BookmarksTagData,
	type NextApiRequest,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
	TAG_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api adds tags to a bookmark

type DataResponse = UserTagsData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// checks if the tag and bookmark is created by user
export const bookmarkAndTagOwnershipCheck = async (
	userId: SingleListData["user_id"]["id"],
	bookmark_id: SingleListData["id"],
	tag_id: UserTagsData["id"],
	supabase: SupabaseClient,
	response: NextApiResponse<Data>,
) => {
	const { data: bookmarksData, error: bookmarkError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("user_id")
		.eq("id", bookmark_id);

	if (bookmarkError) {
		response.status(500).json({ data: null, error: bookmarkError?.message });

		Sentry.captureException(
			`bookmark owner check error ${bookmarkError?.message}`,
		);
		return;
	}

	if (bookmarksData?.[0]?.user_id !== userId) {
		response
			.status(500)
			.json({ data: null, error: "User is not the owner of item" });
		return;
	}

	const { data: tagData, error: tagError } = await supabase
		.from(TAG_TABLE_NAME)
		.select("user_id")
		.eq("id", tag_id);

	if (tagError) {
		response.status(500).json({ data: null, error: tagError?.message });

		Sentry.captureException(`tag owner check error ${tagError?.message}`);
		return;
	}

	if (tagData?.[0]?.user_id !== userId) {
		response
			.status(500)
			.json({ data: null, error: "User is not the owner of tag" });
	}
};

export default async function handler(
	request: NextApiRequest<{
		data: {
			bookmark_id: SingleListData["id"];
			tag_id: BookmarksTagData["id"];
		};
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	await bookmarkAndTagOwnershipCheck(
		userId,
		request?.body?.data?.bookmark_id,
		request?.body?.data?.tag_id as number,
		supabase,
		response,
	);

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.insert({
				...request.body.data,
				user_id: userId,
			})
			.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
	}
}
