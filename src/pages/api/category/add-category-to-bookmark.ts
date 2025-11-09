import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";

import {
	type AddCategoryToBookmarkApiPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
	message: string | null;
};

// this api adds category to a bookmark
// it updates category based on the user's access role for the category
export default async function handler(
	request: NextApiRequest<AddCategoryToBookmarkApiPayload>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const {
		update_access: updateAccess,
		category_id: categoryId,
		bookmark_id: bookmarkId,
	} = request.body;

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

	// this updates the category id for the bookmark
	const updateCategoryIdLogic = async () => {
		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(MAIN_TABLE_NAME)
				.update({ category_id: updateAccess ? categoryId : null })
				.match({ id: bookmarkId, user_id: userId })
				.select();

		if (!isNull(data)) {
			response.status(200).json({
				data,
				error,
				message: updateAccess ? null : ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
			});
		} else {
			response.status(500).json({ data, error, message: null });
			throw new Error("ERROR: update category db error");
		}
	};

	// check if the bookmark for which the category id is being updated is created by the user

	const { data: bookmarkData, error: bookmarkError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(`user_id`)
		.eq("id", bookmarkId);

	if (bookmarkError) {
		response.status(500).json({
			data: null,
			error: "error fetching user bookmark data",
			message: bookmarkError?.message,
		});
		throw new Error("ERROR: error fetching user bookmark data");
	}

	if (bookmarkData?.[0]?.user_id !== userId) {
		// this means the bookmark has not been created by the user
		response.status(500).json({
			data: null,
			error: "user is not the bookmark owner",
			message: null,
		});
		throw new Error("ERROR: user is not the bookmark owner");
	}

	// get category data
	const { data: categoryData, error: categoryError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(`user_id`)
		.eq("id", categoryId);

	if (categoryError) {
		response.status(500).json({
			data: null,
			error: "error fetching user category data",
			message: categoryError?.message,
		});
		throw new Error("ERROR: error fetching user category data");
	}

	const categoryUserId = categoryData?.[0]?.user_id;

	if (categoryUserId !== userId && categoryId !== 0) {
		// the user is not the category owner, and category id should not be 0 if it is then user is moving bookmark to uncategorized

		// we check if user is a collaborator if so check users edit access in the category

		const { data: sharedCategoryData, error: sharedCategoryError } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select(`edit_access`)
				.eq("category_id", categoryId)
				.eq("email", email);

		if (sharedCategoryError) {
			response.status(500).json({
				data: null,
				error: "error fetching shared category data",
				message: sharedCategoryError?.message,
			});
			throw new Error("ERROR: error fetching shared category data");
		}

		if (!isEmpty(sharedCategoryData)) {
			// user is a collab for the category
			if (sharedCategoryData?.[0]?.edit_access) {
				// user has edit access
				await updateCategoryIdLogic();
			} else {
				// user does not have edit access
				response.status(500).json({
					data: null,
					error: "user does not have edit access",
					message: null,
				});
				throw new Error("ERROR: user does not have edit access");
			}
		} else {
			// user is not a collab for the category
			response.status(500).json({
				data: null,
				error: "user is not the owner of category",
				message: null,
			});
			throw new Error("ERROR: user is not the owner of category");
		}
	}

	// only if user is owner , or user has edit access they can update the bookmark category in the table, or else bookmark will be added with category null
	await updateCategoryIdLogic();
}
