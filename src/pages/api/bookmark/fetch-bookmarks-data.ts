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
	AUDIO_URL,
	audioFileTypes,
	BOOKMARK_CATEGORIES_TABLE_NAME,
	BOOKMARK_TAGS_TABLE_NAME,
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	imageFileTypes,
	IMAGES_URL,
	INSTAGRAM_URL,
	instagramType,
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
	const isUncategorized = category_id === UNCATEGORIZED_URL;
	let data;

	// Determine if this is a shared category (needs profile join for per-bookmark avatars)
	let isSharedCategory = false;
	let isUserCollaboratorInCategoryValue = false;
	let isUserOwnerOfCategory = false;

	if (categoryCondition) {
		const {
			success: isUserCollaboratorInCategorySuccess,
			isCollaborator,
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
			isOwner,
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

		isUserCollaboratorInCategoryValue = isCollaborator;
		isUserOwnerOfCategory = isOwner;
		isSharedCategory =
			isUserCollaboratorInCategoryValue || isUserOwnerOfCategory;
	}

	// Only join profile data for shared categories (need per-bookmark avatars)
	const needsJunction = categoryCondition || isUncategorized;
	const baseSelect = `*`;
	const junctionSelect = `*, ${BOOKMARK_CATEGORIES_TABLE_NAME}!inner(bookmark_id, category_id)`;
	const sharedJunctionSelect = `*, user_id (id, profile_pic), ${BOOKMARK_CATEGORIES_TABLE_NAME}!inner(bookmark_id, category_id)`;

	let selectString;
	if (needsJunction) {
		selectString = isSharedCategory ? sharedJunctionSelect : junctionSelect;
	} else {
		selectString = baseSelect;
	}

	// get all bookmarks - use junction JOIN for category filtering
	const isTrashPage = category_id === TRASH_URL;
	let query = supabase
		.from(MAIN_TABLE_NAME)
		.select(selectString)
		.range(from, from + PAGINATION_LIMIT - 1);

	// Filter by trash status: trash IS NULL for non-trash, trash IS NOT NULL for trash page
	if (isTrashPage) {
		query = query.not("trash", "is", null);
	} else {
		query = query.is("trash", null);
	}

	if (categoryCondition) {
		// Use JOIN filter for category - handles unlimited bookmarks efficiently
		const numericCategoryId = Number.parseInt(category_id as string, 10);
		query = query.eq(
			`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`,
			numericCategoryId,
		);

		if (isSharedCategory) {
			// User is collaborator or owner - access all items in the category (no user filter needed)
		} else {
			// User is not collaborator - only access items they created
			query = query.eq("user_id", userId);
		}
	} else {
		query = query.eq("user_id", userId);
	}

	if (category_id === UNCATEGORIZED_URL) {
		// Use JOIN filter for uncategorized (category_id = 0) - handles unlimited bookmarks
		query = query
			.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, 0)
			.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.user_id`, userId);
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

	if (category_id === AUDIO_URL) {
		query = query.or(
			`type.in.(${audioFileTypes}),meta_data->>mediaType.in.(${audioFileTypes})`,
		);
	}

	if (category_id === instagramType) {
		query = query.eq("type", instagramType);
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

	if (category_id === INSTAGRAM_URL) {
		query = query.eq("type", instagramType);
	}

	// Sort by trash timestamp for trash page (most recently trashed first)
	if (isTrashPage) {
		query = query.order("trash", { ascending: false });
	} else if (sortValue === "date-sort-ascending") {
		// newest first
		query = query.order("inserted_at", { ascending: false });
	} else if (sortValue === "date-sort-descending") {
		// oldest first
		query = query.order("inserted_at", { ascending: true });
	} else if (sortValue === "alphabetical-sort-ascending") {
		// title A-Z
		query = query.order("title", { ascending: true });
	} else if (sortValue === "alphabetical-sort-descending") {
		// title Z-A
		query = query.order("title", { ascending: false });
	} else if (sortValue === "url-sort-ascending") {
		// url A-Z
		query = query.order("url", { ascending: true });
	} else if (sortValue === "url-sort-descending") {
		// url Z-A
		query = query.order("url", { ascending: false });
	} else if (category_id === TWEETS_URL) {
		query = query.order("sort_index", { ascending: false });
	} else {
		// Default fallback: newest first
		query = query.order("inserted_at", { ascending: true });
	}

	const { data: bookmarkData, error } = await query;

	// Cast through unknown - Supabase's type parser doesn't understand !inner join syntax
	// eslint-disable-next-line prefer-const
	data = bookmarkData as unknown as SingleListData[];

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

	// Always fetch ALL categories for each bookmark (INNER JOIN only has filtered category)
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

			// Always use separate query result for complete category data
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
