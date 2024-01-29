import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";

import {
	type BookmarksCountTypes,
	type BookmarksWithTagsWithTagForginKeys,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
	TRASH_URL,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import { isUserInACategoryInFetchBookmarksApi } from "../../../utils/helpers";
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
	const { category_id, sort_by: sortVaue } = request.query;
	const from = Number.parseInt(request.query.from as string, 10);

	const accessToken = request.query.access_token as string;

	const supabase = apiSupabaseClient();

	let userId: string | (() => string) | undefined;

	const { error: _error, decoded } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error, count: null });
		throw new Error("ERROR: token error");
	} else {
		userId = decoded?.sub;
	}

	// tells if user is in a category or not
	const categoryCondition = isUserInACategoryInFetchBookmarksApi(
		category_id as string,
	);
	let data;

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

	if (category_id === DOCUMENTS_URL) {
		query = query.in("type", documentFileTypes);
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
		) as unknown as BookmarksWithTagsWithTagForginKeys;

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
