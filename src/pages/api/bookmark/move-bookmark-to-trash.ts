import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type MoveBookmarkToTrashApiPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";

// this is a cascading delete, deletes bookmarks from main table and all its respective joint tables

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

	// Get categories for revalidation before trashing/restoring
	const { data: bookmarkCategories } = await supabase
		.from(BOOKMARK_CATEGORIES_TABLE_NAME)
		.select("category_id")
		.eq("bookmark_id", bookmarkData?.id);

	const categoryIdsToRevalidate =
		bookmarkCategories?.map((bc) => bc.category_id) ?? [];

	// Set trash to current timestamp when moving to trash, null when restoring
	const trashValue = request.body.isTrash ? new Date().toISOString() : null;

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ trash: trashValue })
			.match({ id: bookmarkData?.id, user_id: userId })
			.select();

	if (!isNull(data)) {
		// Trigger revalidation for public categories that contained this bookmark
		// This applies when moving to trash OR restoring from trash
		if (categoryIdsToRevalidate.length > 0) {
			void revalidateCategoriesIfPublic(categoryIdsToRevalidate, {
				operation: "move_bookmark_to_trash",
				userId,
			});
		}

		response.status(200).json({ data, error });
	} else {
		response.status(500).json({ data, error });
		throw new Error("ERROR: move to trash db error");
	}
}
