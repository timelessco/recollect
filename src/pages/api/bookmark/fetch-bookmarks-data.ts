import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
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
	CATEGORIES_TABLE_NAME,
	documentFileTypes,
	DOCUMENTS_URL,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
	SHARED_CATEGORIES_TABLE_NAME,
	TRASH_URL,
	TWEETS_URL,
	tweetType,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import { isUserInACategoryInApi } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

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

	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

	// tells if user is a collaborator for the category
	const isUserCollaboratorInCategory = async () => {
		const { data: sharedCategoryData, error: sharedCategoryError } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select("id")
				.eq("category_id", category_id)
				.eq("email", email);

		if (sharedCategoryError) {
			Sentry.captureException(
				`Get shared catagory data error : ${sharedCategoryError?.message}`,
			);
			response
				.status(500)
				.json({ data: null, error: sharedCategoryError?.message, count: null });
			return false;
		}

		return !isEmpty(sharedCategoryData);
	};

	const checkIsUserOwnerOfCategory = async () => {
		const { data: categoryData, error: categoryDataError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("user_id")
			.eq("id", category_id);

		if (categoryDataError) {
			Sentry.captureException(
				`Get category data error : ${categoryDataError?.message}`,
			);
			response
				.status(500)
				.json({ data: null, error: categoryDataError?.message, count: null });
			return false;
		}

		return categoryData?.[0]?.user_id === userId;
	};

	// tells if user is in a category or not
	const categoryCondition = isUserInACategoryInApi(category_id as string);
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
		// check if user is user is a collaborator for the category_id
		const isUserCollaboratorInCategoryValue =
			await isUserCollaboratorInCategory();

		const isUserOwnerOfCategory = await checkIsUserOwnerOfCategory();

		if (isUserCollaboratorInCategoryValue || isUserOwnerOfCategory) {
			// **** here we are checking if user is a collaborator for the category_id or user is the owner of the category
			// user is collaborator
			// get all the items for the category_id irrespective of the user_is , as user has access to all the items in the category
			query = query.eq("category_id", category_id);
		} else {
			// user is not collaborator
			// get only the items that match the user_id and category_id, as user only has access to items created by the user
			query = query.eq("category_id", category_id);
			query = query.eq("user_id", userId);
		}
	} else {
		query = query.eq("user_id", userId);
	}

	if (category_id === UNCATEGORIZED_URL) {
		query = query.eq("category_id", 0);
	}

	if (category_id === IMAGES_URL) {
		query = query.or(
			`type.in.(${imageFileTypes}),meta_data->>mediaType.in.(${imageFileTypes})`,
		);
	}

	if (category_id === VIDEOS_URL) {
		query = query.or(
			`type.in.(${videoFileTypes}),meta_data->>mediaType.in.(${videoFileTypes})`,
		);
	}

	if (category_id === DOCUMENTS_URL) {
		query = query.or(
			`type.in.(${documentFileTypes}),meta_data->>mediaType.in.(${documentFileTypes})`,
		);
	}

	if (category_id === LINKS_URL) {
		query = query.eq("type", bookmarkType);
	}

	if (category_id === TWEETS_URL) {
		query = query
			.eq("type", tweetType)
			.order("sort_index", { ascending: false });
	}

	if (sortVaue === "date-sort-acending") {
		// newest first
		query = query.order("inserted_at", { ascending: false });
	} else if (sortVaue === "date-sort-decending") {
		// oldest first
		query = query.order("inserted_at", { ascending: true });
	} else if (sortVaue === "alphabetical-sort-acending") {
		// title A-Z
		query = query.order("title", { ascending: true });
	} else if (sortVaue === "alphabetical-sort-decending") {
		// title Z-A
		query = query.order("title", { ascending: false });
	} else if (sortVaue === "url-sort-acending") {
		// url A-Z
		query = query.order("url", { ascending: true });
	} else if (sortVaue === "url-sort-decending") {
		// url Z-A
		query = query.order("url", { ascending: false });
	} else if (category_id === TWEETS_URL) {
		query = query.order("sort_index", { ascending: false });
	} else {
		// Default fallback: newest first
		query = query.order("inserted_at", { ascending: true });
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
