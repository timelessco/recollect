/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/bookmark/fetch-bookmarks-data
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import isEmpty from "lodash/isEmpty";

import type {
  BookmarksCountTypes,
  BookmarksWithCategoriesWithCategoryForeignKeys,
  BookmarksWithTagsWithTagForginKeys,
  SingleListData,
} from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { getBookmarkMediaCategoryPredicate } from "../../../utils/bookmark-category-filters";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  bookmarkType,
  INSTAGRAM_URL,
  instagramType,
  LINKS_URL,
  MAIN_TABLE_NAME,
  PAGINATION_LIMIT,
  TRASH_URL,
  TWEETS_URL,
  tweetType,
  UNCATEGORIZED_URL,
} from "../../../utils/constants";
import {
  checkIsUserOwnerOfCategory,
  isUserCollaboratorInCategory,
  isUserInACategoryInApi,
} from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// gets all bookmarks data mapped with the data related to other tables, like tags, categories etc...

interface Data {
  count: BookmarksCountTypes | null;
  data: null | SingleListData[];
  error: { message: string } | null | PostgrestError | VerifyErrors;
}

// Scoped RLS can hide the joined row, so the FK side returns null — drop those before mapping.
type TagJoinRow = BookmarksWithTagsWithTagForginKeys[number];
type CategoryJoinRow = BookmarksWithCategoriesWithCategoryForeignKeys[number];
const hasTag = (
  row: TagJoinRow,
): row is TagJoinRow & { tag_id: NonNullable<TagJoinRow["tag_id"]> } => row.tag_id !== null;
const hasCategory = (
  row: CategoryJoinRow,
): row is CategoryJoinRow & { category_id: NonNullable<CategoryJoinRow["category_id"]> } =>
  row.category_id !== null;

export default async function handler(request: NextApiRequest, response: NextApiResponse<Data>) {
  // disabling as this is not that big of an issue
  const { category_id, sort_by: sortValue } = request.query;
  const from = Number.parseInt(request.query.from as string, 10);

  const supabase = apiSupabaseClient(request, response);

  const authResult = await supabase?.auth?.getUser();

  const userId = authResult?.data?.user?.id;
  const email = authResult?.data?.user?.email;

  // tells if user is in a category or not
  const categoryCondition = isUserInACategoryInApi(category_id as string);
  const isUncategorized = category_id === UNCATEGORIZED_URL;
  // oxlint-disable-next-line prefer-const -- reassigned on line 239
  let data;

  // Determine if this is a shared category (needs profile join for per-bookmark avatars)
  let isSharedCategory = false;
  let isUserCollaboratorInCategoryValue = false;
  let isUserOwnerOfCategory = false;

  if (categoryCondition) {
    const {
      error: isUserCollaboratorInCategoryError,
      isCollaborator,
      success: isUserCollaboratorInCategorySuccess,
    } = await isUserCollaboratorInCategory(supabase, category_id as string, email!);

    if (!isUserCollaboratorInCategorySuccess) {
      console.error(
        "[fetch-bookmarks-data] Error checking if user is a collaborator for the category:",
        isUserCollaboratorInCategoryError,
      );
      Sentry.captureException(isUserCollaboratorInCategoryError, {
        extra: { category_id },
        tags: {
          operation: "check_user_collaborator_of_category",
        },
        user: {
          email,
          id: userId,
        },
      });
      response.status(500).json({
        count: null,
        data: null,
        error: {
          message: "Error checking if user is a collaborator for the category",
        },
      });
      return;
    }

    const {
      error: isUserOwnerOfCategoryError,
      isOwner,
      success: isUserOwnerOfCategorySuccess,
    } = await checkIsUserOwnerOfCategory(supabase, category_id as string, userId!);

    if (!isUserOwnerOfCategorySuccess) {
      console.error(
        "[fetch-bookmarks-data] Error checking if user is the owner of the category:",
        isUserOwnerOfCategoryError,
      );
      Sentry.captureException(isUserOwnerOfCategoryError, {
        extra: { category_id },
        tags: {
          operation: "check_user_owner_of_category",
        },
        user: {
          email,
          id: userId,
        },
      });
      response.status(500).json({
        count: null,
        data: null,
        error: {
          message: "Error checking if user is the owner of the category",
        },
      });
      return;
    }

    isUserCollaboratorInCategoryValue = isCollaborator;
    isUserOwnerOfCategory = isOwner;
    isSharedCategory = isUserCollaboratorInCategoryValue || isUserOwnerOfCategory;
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
  query = isTrashPage ? query.not("trash", "is", null) : query.is("trash", null);

  if (categoryCondition) {
    // Use JOIN filter for category - handles unlimited bookmarks efficiently
    const numericCategoryId = Number.parseInt(category_id as string, 10);
    query = query.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, numericCategoryId);

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

  const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(
    category_id as string | undefined,
  );

  if (mediaCategoryPredicate) {
    query = query.or(mediaCategoryPredicate);
  }

  if (category_id === instagramType) {
    query = query.eq("type", instagramType);
  }

  if (category_id === LINKS_URL) {
    query = query.eq("type", bookmarkType);
  }

  if (category_id === TWEETS_URL) {
    query = query.eq("type", tweetType).order("sort_index", { ascending: false });
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
      const matchedBookmarkWithTag = (
        bookmarksWithTags?.filter(
          (tagItem) => tagItem?.bookmark_id === item?.id,
        ) as unknown as BookmarksWithTagsWithTagForginKeys
      )?.filter(hasTag);

      // Always use separate query result for complete category data
      const matchedBookmarkWithCategory = (
        bookmarksWithCategories?.filter(
          (catItem) => catItem?.bookmark_id === item?.id,
        ) as unknown as BookmarksWithCategoriesWithCategoryForeignKeys
      )?.filter(hasCategory);

      return {
        ...item,
        addedCategories: !isEmpty(matchedBookmarkWithCategory)
          ? matchedBookmarkWithCategory?.map((matchedItem) => ({
              category_name: matchedItem.category_id.category_name,
              category_slug: matchedItem.category_id.category_slug,
              icon: matchedItem.category_id.icon,
              icon_color: matchedItem.category_id.icon_color,
              id: matchedItem.category_id.id,
            }))
          : [],
        addedTags: !isEmpty(matchedBookmarkWithTag)
          ? matchedBookmarkWithTag?.map((matchedItem) => ({
              id: matchedItem.tag_id.id,
              name: matchedItem.tag_id.name,
            }))
          : [],
      };
    })
    .filter(Boolean) as SingleListData[];

  response.status(200).json({ count: null, data: finalData, error });
}
