import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type BookmarkViewDataTypes,
	type NextApiRequest,
} from "../../../types/apiTypes";
import { CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// this fetches bookmarks view based on category

type Data = {
	data: Array<{ category_views: BookmarkViewDataTypes }> | null;
	error: PostgrestError | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest<{ category_id: number }>,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const { category_id: categorieId } = request.body;

	const { data, error } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
      category_views
    `,
		)
		.eq("id", categorieId);

	if (!isNull(data)) {
		response.status(200).json({ data, error });
	} else {
		response.status(500).json({ data, error });
		throw new Error("ERROR: fetch bookmarks views db error");
	}
}
