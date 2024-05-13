import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type MoveBookmarkToTrashApiPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest<MoveBookmarkToTrashApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const bookmarkData = request.body.data;

	// this is so that user can trash only the users created items
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ trash: request.body.isTrash })
			.match({ id: bookmarkData?.id, user_id: userId })
			.select();

	if (!isNull(data)) {
		response.status(200).json({ data, error });
	} else {
		response.status(500).json({ data, error });
		throw new Error("ERROR: move to trash db error");
	}
}
