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
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

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
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const bookmarkData = request.body.data;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ trash: request.body.isTrash })
			.match({ id: bookmarkData?.id })
			.select();

	if (!isNull(data)) {
		response.status(200).json({ data, error });
	} else {
		response.status(500).json({ data, error });
		throw new Error("ERROR: move to trash db error");
	}
}
