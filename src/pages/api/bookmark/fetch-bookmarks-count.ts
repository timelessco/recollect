/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/bookmark/fetch-bookmarks-count
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiRequest, NextApiResponse } from "next";

import isEmpty from "lodash/isEmpty";

import type { BookmarksCountTypes } from "../../../types/apiTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BOOKMARK_MEDIA_CATEGORY_PREDICATES } from "../../../utils/bookmark-category-filters";
import {
  bookmarkType,
  CATEGORIES_TABLE_NAME,
  DOCUMENTS_URL,
  IMAGES_URL,
  instagramType,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  tweetType,
  VIDEOS_URL,
  AUDIO_URL,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

interface Data {
  data: BookmarksCountTypes | null;
  error: null | string[];
}

const getCategoryCount = async (
  supabase: SupabaseClient,
  categoryIds: number[],
  sharedCategories: number[],
) => {
  // Single query replacing the per-category N+1. Same root table + same RLS
  // + same inner-join + trash filter as the previous loop — only the
  // category_id filter widens from `= X` to `IN (all)`. Each returned row is
  // a visible non-trashed bookmark with its matching junction rows as an
  // embedded array; we tally per-category in JS. One round-trip replaces up
  // to N.
  const allCategoryIds = [...new Set([...categoryIds, ...sharedCategories])];

  if (allCategoryIds.length === 0) {
    return [];
  }

  const { data: bookmarkCategoryRows } = await supabase
    .from(MAIN_TABLE_NAME)
    .select("id, bookmark_categories!inner(category_id)")
    .in("bookmark_categories.category_id", allCategoryIds)
    .is("trash", null);

  const countByCategoryId = new Map<number, number>();
  for (const row of (bookmarkCategoryRows as {
    bookmark_categories: { category_id: number }[];
  }[]) ?? []) {
    for (const junction of row.bookmark_categories ?? []) {
      countByCategoryId.set(
        junction.category_id,
        (countByCategoryId.get(junction.category_id) ?? 0) + 1,
      );
    }
  }

  return allCategoryIds.map((categoryId) => ({
    category_id: categoryId,
    count: countByCategoryId.get(categoryId) ?? 0,
  }));
};

export default async function handler(request: NextApiRequest, response: NextApiResponse<Data>) {
  const supabase = apiSupabaseClient(request, response);

  const userData = await supabase?.auth?.getUser();

  const userId = userData?.data?.user?.id;
  const email = userData?.data?.user?.email;

  let count: BookmarksCountTypes = {
    audio: 0,
    categoryCount: [],
    documents: 0,
    everything: 0,
    images: 0,
    instagram: 0,
    links: 0,
    trash: 0,
    tweets: 0,
    uncategorized: 0,
    videos: 0,
  };

  try {
    const [
      { count: bookmarkCount },
      { count: bookmarkImageCount },
      { count: bookmarkVideoCount },
      { count: bookmarkDocumentCount },
      { count: bookmarksLinks },
      { count: bookmarkTrashCount },
      { count: bookmarkUnCatCount },
      { count: bookmarkTweetsCount },
      { count: bookmarkInstagramCount },
      { count: bookmarkAudioCount },
      { data: userCategoryIds },
      { data: sharedCategoryIds },
    ] = await Promise.all([
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[IMAGES_URL]),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[VIDEOS_URL]),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[DOCUMENTS_URL]),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", bookmarkType),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("trash", "is", null),
      // Count from junction table, filtering out trashed (category_id 0 = uncategorized)
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id, bookmark_categories!inner(category_id)", {
          count: "exact",
          head: true,
        })
        .eq("bookmark_categories.category_id", 0)
        .eq("bookmark_categories.user_id", userId)
        .is("trash", null),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", tweetType),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", instagramType),
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[AUDIO_URL]),
      supabase.from(CATEGORIES_TABLE_NAME).select("id").eq("user_id", userId),
      supabase.from(SHARED_CATEGORIES_TABLE_NAME).select("category_id").eq("email", email),
    ]);

    count = {
      ...count,
      audio: bookmarkAudioCount ?? 0,
      documents: bookmarkDocumentCount ?? 0,
      everything: bookmarkCount ?? 0,
      images: bookmarkImageCount ?? 0,
      instagram: bookmarkInstagramCount ?? 0,
      links: bookmarksLinks ?? 0,
      trash: bookmarkTrashCount ?? 0,
      tweets: bookmarkTweetsCount ?? 0,
      uncategorized: bookmarkUnCatCount ?? 0,
      videos: bookmarkVideoCount ?? 0,
    };

    const userCategoryIdsArray = userCategoryIds?.map((item) => item.id) ?? [];
    const sharedCategoryIdsArray = sharedCategoryIds?.map((item) => item.category_id) ?? [];

    const categoryCount = (await getCategoryCount(
      supabase,
      userCategoryIdsArray,
      sharedCategoryIdsArray,
    )) as BookmarksCountTypes["categoryCount"];

    count = {
      ...count,
      categoryCount,
    };
  } catch (error) {
    console.error("Error in API:", error);
    response.status(500).json({ data: null, error: ["Internal Server Error"] });
    return;
  }

  const errorMessages = ["Unauthorized", "Internal Server Error"];

  const nonEmptyErrors = errorMessages.filter((message) => !isEmpty(message));

  response.status(200).json({ data: count, error: nonEmptyErrors });
}
