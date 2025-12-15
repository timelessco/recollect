import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";

import {
	type BookmarksCountTypes,
	type BookmarksWithCategoriesWithCategoryForeignKeys,
	type BookmarksWithTagsWithTagForginKeys,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
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
	TWEETS_URL,
	tweetType,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import {
	checkIsUserOwnerOfCategory,
	isUserCollaboratorInCategory,
	isUserInACategoryInApi,
} from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// gets all bookmarks data mapped with the data related to other tables, like tags, categories etc...

type Data = {
	count: BookmarksCountTypes | null;
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | { message: string } | null;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	// disabling as this is not that big of an issue
	const { category_id, sort_by: sortValue } = request.query;
	const from = Number.parseInt(request.query.from as string, 10);

	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

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
		// .eq('user_id', userId) // this is for '/' (root-page) route , we need bookmarks by user_id // TODO: check and remove
		.eq("trash", category_id === TRASH_URL)
		.range(from === 0 ? from : from + 1, from + PAGINATION_LIMIT);

	if (categoryCondition) {
		// check if user is user is a collaborator for the category_id
		const {
			success: isUserCollaboratorInCategorySuccess,
			isCollaborator: isUserCollaboratorInCategoryValue,
			error: isUserCollaboratorInCategoryError,
		} = await isUserCollaboratorInCategory(
			supabase,
			category_id as string,
			email,
		);

		if (!isUserCollaboratorInCategorySuccess) {
			console.error(
				"[fetch-bookmarks-data] Error checking if user is a collaborator for the category:",
				isUserCollaboratorInCategoryError,
			);
			Sentry.captureException(isUserCollaboratorInCategoryError, {
				tags: {
					operation: "check_user_collaborator_of_category",
				},
				extra: { category_id },
				user: {
					id: userId,
					email,
				},
			});
			response.status(500).json({
				data: null,
				error: {
					message: "Error checking if user is a collaborator for the category",
				},
				count: null,
			});
			return;
		}

		const {
			success: isUserOwnerOfCategorySuccess,
			isOwner: isUserOwnerOfCategory,
			error: isUserOwnerOfCategoryError,
		} = await checkIsUserOwnerOfCategory(
			supabase,
			category_id as string,
			userId,
		);

		if (!isUserOwnerOfCategorySuccess) {
			console.error(
				"[fetch-bookmarks-data] Error checking if user is the owner of the category:",
				isUserOwnerOfCategoryError,
			);
			Sentry.captureException(isUserOwnerOfCategoryError, {
				tags: {
					operation: "check_user_owner_of_category",
				},
				extra: { category_id },
				user: {
					id: userId,
					email,
				},
			});
			response.status(500).json({
				data: null,
				error: {
					message: "Error checking if user is the owner of the category",
				},
				count: null,
			});
			return;
		}

		// Query junction table for bookmark IDs in this category
		const numericCategoryId = Number.parseInt(category_id as string, 10);
		const { data: junctionBookmarks } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select("bookmark_id")
			.eq("category_id", numericCategoryId);

		const junctionIds =
			junctionBookmarks?.map((item) => item.bookmark_id) ?? [];

		if (isUserCollaboratorInCategoryValue || isUserOwnerOfCategory) {
			// User is collaborator or owner - access all items in the category
			if (junctionIds.length > 0) {
				query = query.in("id", junctionIds);
			} else {
				// No bookmarks in this category - return empty result
				query = query.in("id", [-1]);
			}
		} else {
			// User is not collaborator - only access items they created
			if (junctionIds.length > 0) {
				query = query.in("id", junctionIds);
			} else {
				query = query.in("id", [-1]);
			}

			query = query.eq("user_id", userId);
		}
	} else {
		query = query.eq("user_id", userId);
	}

	if (category_id === UNCATEGORIZED_URL) {
		// Query junction table for uncategorized bookmarks (category_id = 0)
		const { data: uncatJunction } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select("bookmark_id")
			.eq("category_id", 0)
			.eq("user_id", userId);

		const uncatIds = uncatJunction?.map((item) => item.bookmark_id) ?? [];
		if (uncatIds.length > 0) {
			query = query.in("id", uncatIds);
		} else {
			query = query.in("id", [-1]);
		}
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

	if (sortValue === "date-sort-acending") {
		// newest first
		query = query.order("inserted_at", { ascending: false });
	} else if (sortValue === "date-sort-decending") {
		// oldest first
		query = query.order("inserted_at", { ascending: true });
	} else if (sortValue === "alphabetical-sort-acending") {
		// title A-Z
		query = query.order("title", { ascending: true });
	} else if (sortValue === "alphabetical-sort-decending") {
		// title Z-A
		query = query.order("title", { ascending: false });
	} else if (sortValue === "url-sort-acending") {
		// url A-Z
		query = query.order("url", { ascending: true });
	} else if (sortValue === "url-sort-decending") {
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

	// Get bookmark IDs for the current page to filter related data
	const bookmarkIds = data?.map((item) => item.id) ?? [];

	// Only fetch tags/categories for the current page's bookmarks (more efficient + avoids 1000 row limit)
	const { data: bookmarksWithTags } = bookmarkIds.length
		? await supabase
				.from(BOOKMARK_TAGS_TABLE_NAME)
				.select(
					`
    bookmark_id,
    tag_id (
      id,
      name
    )`,
				)
				.in("bookmark_id", bookmarkIds)
		: { data: [] };

	const { data: bookmarksWithCategories } = bookmarkIds.length
		? await supabase
				.from(BOOKMARK_CATEGORIES_TABLE_NAME)
				.select(
					`
    bookmark_id,
    category_id (
      id,
      category_name,
      category_slug,
      icon,
      icon_color
    )`,
				)
				.in("bookmark_id", bookmarkIds)
				.order("created_at", { ascending: true })
		: { data: [] };

	const finalData = data
		?.map((item) => {
			const matchedBookmarkWithTag = bookmarksWithTags?.filter(
				(tagItem) => tagItem?.bookmark_id === item?.id,
			) as unknown as BookmarksWithTagsWithTagForginKeys;

			const matchedBookmarkWithCategory = bookmarksWithCategories?.filter(
				(catItem) => catItem?.bookmark_id === item?.id,
			) as unknown as BookmarksWithCategoriesWithCategoryForeignKeys;

			return {
				...item,
				addedTags: !isEmpty(matchedBookmarkWithTag)
					? matchedBookmarkWithTag?.map((matchedItem) => ({
							id: matchedItem?.tag_id?.id,
							name: matchedItem?.tag_id?.name,
						}))
					: [],
				addedCategories: !isEmpty(matchedBookmarkWithCategory)
					? matchedBookmarkWithCategory?.map((matchedItem) => ({
							id: matchedItem?.category_id?.id,
							category_name: matchedItem?.category_id?.category_name,
							category_slug: matchedItem?.category_id?.category_slug,
							icon: matchedItem?.category_id?.icon,
							icon_color: matchedItem?.category_id?.icon_color,
						}))
					: [],
			};
		})
		.filter(Boolean) as SingleListData[];

	response.status(200).json({ data: finalData, error, count: null });
}
