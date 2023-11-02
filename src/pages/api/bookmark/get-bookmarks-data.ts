/* eslint-disable complexity */
import { type NextApiRequest, type NextApiResponse } from "next";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";

import {
	type BookmarksCountTypes,
	type BookmarksWithTagsWithTagForginKeys,
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
	TRASH_URL,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// gets all bookmarks data mapped with the data related to other tables , like tags , catrgories etc...

type Data = {
	count: BookmarksCountTypes | null;
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	// disabling as this is not that big of an issue
	const { category_id } = request.query;
	const from = Number.parseInt(request.query.from as string, 10);

	const accessToken = request.query.access_token as string;

	const supabase = apiSupabaseClient();

	let userId: string | (() => string) | undefined;
	let email: string | (() => string) | undefined;

	const { error: _error, decoded } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error, count: null });
		throw new Error("ERROR: token error");
	} else {
		userId = decoded?.sub;
		email = decoded?.email;
	}

	// tells if user is in a category or not
	const categoryCondition =
		category_id !== null &&
		category_id !== "null" &&
		category_id !== TRASH_URL &&
		category_id !== UNCATEGORIZED_URL &&
		category_id !== IMAGES_URL &&
		category_id !== VIDEOS_URL &&
		category_id !== LINKS_URL;

	let data;
	let sortVaue;

	if (categoryCondition) {
		// if in a category, get sortBy from category table

		// gets shared category data, if this is not empty then it means the user not the category owner
		const { data: sharedCategoryData, error: sharedCategoryError } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select(`category_views`)
				.eq("email", email)
				.eq("category_id", category_id);

		if (!isNil(sharedCategoryError)) {
			throw new Error("ERROR: sharedCategoryError");
		}

		if (isEmpty(sharedCategoryData) || isNull(sharedCategoryData)) {
			// when the sharedCategoryData is empty then the user is the owner of the category
			// get the sort value from the category table
			const {
				data: userCategorySortData,
			}: PostgrestResponse<{ category_views: BookmarkViewDataTypes }> =
				await supabase
					.from(CATEGORIES_TABLE_NAME)
					.select(`category_views`)
					.eq("user_id", userId)
					.eq("id", category_id);

			sortVaue =
				!isEmpty(userCategorySortData) &&
				!isNull(userCategorySortData) &&
				userCategorySortData[0]?.category_views?.sortBy;
		} else {
			// user is not the category owner , so get the sort value from share category table
			sortVaue =
				!isEmpty(sharedCategoryData) &&
				sharedCategoryData[0]?.category_views?.sortBy;
		}
	} else {
		// if not in a category, get sortBy from PROFILES table
		const {
			data: userSortData,
		}: PostgrestResponse<{ bookmarks_view: BookmarkViewDataTypes }> =
			await supabase.from(PROFILES).select(`bookmarks_view`).eq("id", userId);

		sortVaue =
			!isNull(userSortData) &&
			!isEmpty(userSortData) &&
			userSortData[0]?.bookmarks_view?.sortBy;
	}

	// get all bookmarks
	let query = supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
*,
user_id,
user_id (
  *
)
`,
		)
		// .eq('user_id', userId) // this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove
		.eq("trash", category_id === TRASH_URL)
		.range(from === 0 ? from : from + 1, from + PAGINATION_LIMIT);

	if (categoryCondition) {
		query = query.eq("category_id", category_id);
	} else {
		query = query.eq("user_id", userId);
	}

	if (category_id === UNCATEGORIZED_URL) {
		query = query.eq("category_id", 0);
	}

	if (category_id === IMAGES_URL) {
		query = query.in("type", imageFileTypes);
	}

	if (category_id === VIDEOS_URL) {
		query = query.in("type", videoFileTypes);
	}

	if (category_id === LINKS_URL) {
		query = query.eq("type", bookmarkType);
	}

	if (sortVaue === "date-sort-acending") {
		query = query.order("id", { ascending: false });
	}

	if (sortVaue === "date-sort-decending") {
		query = query.order("id", { ascending: true });
	}

	if (sortVaue === "alphabetical-sort-acending") {
		query = query.order("title", { ascending: true });
	}

	if (sortVaue === "alphabetical-sort-decending") {
		query = query.order("title", { ascending: false });
	}

	if (sortVaue === "url-sort-acending") {
		query = query.order("url", { ascending: true });
	}

	if (sortVaue === "url-sort-decending") {
		query = query.order("url", { ascending: false });
	}

	const { data: bookmarkData, error } = await query;

	// eslint-disable-next-line prefer-const
	data = bookmarkData as SingleListData[];

	const { data: bookmarksWithTags } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.select(
			`
    bookmark_id,
    tag_id (
      id,
      name
    )`,
		)
		.eq("user_id", userId);

	const finalData = data?.map((item) => {
		const matchedBookmarkWithTag = bookmarksWithTags?.filter(
			(tagItem) => tagItem?.bookmark_id === item?.id,
		) as BookmarksWithTagsWithTagForginKeys;

		if (!isEmpty(matchedBookmarkWithTag)) {
			return {
				...item,
				addedTags: matchedBookmarkWithTag?.map((matchedItem) => ({
					id: matchedItem?.tag_id?.id,
					name: matchedItem?.tag_id?.name,
				})),
			};
		}

		return item;
	}) as SingleListData[];

	response.status(200).json({ data: finalData, error, count: null });
}
