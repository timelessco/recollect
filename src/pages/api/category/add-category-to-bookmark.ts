import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type AddCategoryToBookmarkApiPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	MAIN_TABLE_NAME,
} from "../../../utils/constants";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
	message: string | null;
};

// this api adds catagory to a bookmark
// it upadates cateogry based on the user's access role for the category
export default async function handler(
	request: NextApiRequest<AddCategoryToBookmarkApiPayload>,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ data: null, error: error_, message: null });
				throw new Error("ERROR");
			}
		},
	);
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const { category_id: categoryId } = request.body;
	const { bookmark_id: bookmarkId } = request.body;
	const { update_access: updateAccess } = request.body;

	// only if user is owner , or user has edit access they can update the bookmark category in the table, or else bookmark will be added with category null

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ category_id: updateAccess ? categoryId : null })
			.match({ id: bookmarkId })
			.select();

	if (!isNull(data)) {
		response.status(200).json({
			data,
			error,
			message: updateAccess ? null : ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
		});
	} else {
		response.status(500).json({ data, error, message: null });
		throw new Error("ERROR");
	}
}
