import type { NextApiRequest, NextApiResponse } from "next";

import * as Sentry from "@sentry/nextjs";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";

import type { SingleListData } from "../../../types/apiTypes";
import type { PostgrestError } from "@supabase/supabase-js";
import type { VerifyErrors } from "jsonwebtoken";

import { getBookmarkMediaCategoryPredicate } from "../../../utils/bookmark-category-filters";
import { parseSearchColor } from "../../../utils/colorUtils";
import {
  bookmarkType,
  DISCOVER_URL,
  GET_HASHTAG_TAG_PATTERN,
  GET_SITE_SCOPE_PATTERN,
  INSTAGRAM_URL,
  instagramType,
  LINKS_URL,
  PAGINATION_LIMIT,
  TRASH_URL,
  TWEETS_URL,
  tweetType,
  UNCATEGORIZED_URL,
} from "../../../utils/constants";
import {
  checkIsUserOwnerOfCategory,
  extractTagNamesFromSearch,
  isUserCollaboratorInCategory,
  isUserInACategoryInApi,
} from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = null | SingleListData[];
type ErrorResponse = { message: string } | null | PostgrestError | VerifyErrors;

interface Data {
  data: DataResponse;
  error: ErrorResponse;
}

const querySchema = z.object({
  category_id: z.string().optional(),
  search: z.string().min(1, "Search parameter is required"),
});

export default async function handler(request: NextApiRequest, response: NextApiResponse<Data>) {
  try {
    const parseResult = querySchema.safeParse(request.query);

    if (!parseResult.success) {
      console.warn("[search-bookmarks] Invalid search parameter:", {
        issues: parseResult.error.issues,
      });
      response.status(400).json({
        data: null,
        error: { message: "Search parameter is required" },
      });
      return;
    }

    const supabase = apiSupabaseClient(request, response);

    const { category_id, search } = parseResult.data;

    const isDiscoverPage = category_id === DISCOVER_URL;

    // Discover page doesn't require authentication
    let user_id: string | undefined;
    let email: string | undefined;

    if (!isDiscoverPage) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user_id = userData?.user?.id;
      email = userData?.user?.email;

      if (userError || !user_id) {
        console.warn("[search-bookmarks] Missing user_id from Supabase auth");
        response.status(401).json({
          data: null,
          error: { message: "Unauthorized" },
        });
        return;
      }
    }

    const offset = Number.parseInt(request.query.offset as string, 10) || 0;
    const limit = PAGINATION_LIMIT;

    console.log("[search-bookmarks] API called:", {
      category_id,
      limit,
      offset,
      rawSearch: search,
    });

    const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
    const urlScope = matchedSiteScope?.[0]?.replace("@", "")?.toLowerCase() ?? "";

    // Strip color: prefix first so # in hex values doesn't get parsed as a tag
    const colorMatch = search.match(/color:(\S+)/i);
    const searchColor = colorMatch ? parseSearchColor(colorMatch[1]) : null;
    const searchWithoutColor = search.replace(/color:\S*/i, "");

    // color: prefix present but invalid color → no results
    if (colorMatch && !searchColor) {
       response.status(200).json({ data: [], error: null });; return;
    }

    const searchText = searchWithoutColor
      ?.replace(GET_SITE_SCOPE_PATTERN, "")
      ?.replace(GET_HASHTAG_TAG_PATTERN, "")
      ?.trim();

    const tagName = extractTagNamesFromSearch(searchWithoutColor);

    // Determine category_scope for junction table filtering
    // Only set for numeric category IDs, not special URLs (IMAGES_URL, VIDEOS_URL, etc.)
    const userInCollections = isUserInACategoryInApi(category_id!, false);
    let categoryScope: number | null = null;
    if (userInCollections) {
      categoryScope = category_id === UNCATEGORIZED_URL ? 0 : Number(category_id);
    }

    console.log("[search-bookmarks] Parsed search parameters:", {
      categoryScope,
      searchColor,
      searchText,
      tagName,
      urlScope,
    });

    const isTrashPage = category_id === TRASH_URL;
    let query = supabase
      .rpc("search_bookmarks_url_tag_scope", {
        category_scope: isDiscoverPage ? null : categoryScope,
        color_a: searchColor?.a ?? null,
        color_b: searchColor?.b ?? null,
        color_l: searchColor?.l ?? null,
        search_text: searchText,
        tag_scope: tagName,
        url_scope: urlScope,
      })
      .range(offset, offset + limit - 1);

    // Filter by trash status: trash IS NULL for non-trash, trash IS NOT NULL for trash page
    query = isTrashPage ? query.not("trash", "is", null) : query.is("trash", null);

    if (isDiscoverPage) {
      query = query.not("make_discoverable", "is", null);
    } else {
      const userId = user_id!;
      const userEmail = email!;

      if (!userInCollections) {
        query = query.eq("user_id", userId);
      }

      if (userInCollections) {
        // check if user is a collaborator for the category
        const {
          error: isUserCollaboratorInCategoryError,
          isCollaborator: isUserCollaboratorInCategoryValue,
          success: isUserCollaboratorInCategorySuccess,
        } = await isUserCollaboratorInCategory(supabase, category_id!, userEmail);

        if (!isUserCollaboratorInCategorySuccess) {
          console.error(
            "[search-bookmarks] Error checking if user is a collaborator for the category:",
            isUserCollaboratorInCategoryError,
          );
          Sentry.captureException(isUserCollaboratorInCategoryError, {
            extra: { category_id },
            tags: {
              operation: "check_user_collaborator_of_category",
            },
            user: {
              email: userEmail,
              id: userId,
            },
          });
          response.status(500).json({
            data: null,
            error: {
              message: "Error checking if user is a collaborator for the category",
            },
          });
          return;
        }

        // check if user is the owner of the category
        const {
          error: isUserOwnerOfCategoryError,
          isOwner: isUserOwnerOfCategory,
          success: isUserOwnerOfCategorySuccess,
        } = await checkIsUserOwnerOfCategory(supabase, category_id!, userId);

        if (!isUserOwnerOfCategorySuccess) {
          console.error(
            "[search-bookmarks] Error checking if user is the owner of the category:",
            isUserOwnerOfCategoryError,
          );
          Sentry.captureException(isUserOwnerOfCategoryError, {
            extra: { category_id },
            tags: {
              operation: "check_user_owner_of_category",
            },
            user: {
              email: userEmail,
              id: userId,
            },
          });
          response.status(500).json({
            data: null,
            error: {
              message: "Error checking if user is the owner of the category",
            },
          });
          return;
        }

        // check if user is not a collaborator or the owner of the category
        const is_user_not_collaborator_or_owner =
          !isUserCollaboratorInCategoryValue && !isUserOwnerOfCategory;

        if (is_user_not_collaborator_or_owner) {
          // if user is not a collaborator or the owner of the category, then get only the items that match the user_id and category_id
          query = query.eq("user_id", userId);
        }
      }
    }

    const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(category_id);

    if (mediaCategoryPredicate) {
      query = query.or(mediaCategoryPredicate);
    }

    if (category_id === TWEETS_URL) {
      query = query.eq("type", tweetType);
    }

    if (category_id === INSTAGRAM_URL) {
      query = query.eq("type", instagramType);
    }

    if (category_id === LINKS_URL) {
      query = query.eq("type", bookmarkType);
    }

    const { data, error } = (await query) as unknown as {
      data: DataResponse;
      error: ErrorResponse;
    };

    if (error) {
      console.error("[search-bookmarks] Error executing search query:", {
        category_id,
        error,
        rawSearch: search,
        tagName,
        urlScope,
      });
      Sentry.captureException(error, {
        extra: { category_id, rawSearch: search },
        tags: {
          operation: "search_bookmarks",
          userId: user_id ?? "discover_page",
        },
      });
      response.status(500).json({
        data: null,
        error: { message: "Error executing search query:" },
      });
      return;
    }

    if (!data || isEmpty(data)) {
      console.warn("No data returned from the database while searching bookmarks:", {
        data,
        searchText,
        tagName,
        urlScope,
      });
    }

    console.log("[search-bookmarks] Search query succeeded:", {
      category_id,
      hasTagFilter: !isEmpty(tagName),
      resultsCount: data?.length ?? 0,
    });

    const finalData = (data ?? []).map((item) => {
      const {
        added_categories: addedCategories,
        added_tags: addedTags,
        ogimage,
        ...rest
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      } = item as any;

      return {
        ...(rest as SingleListData),
        addedCategories,
        addedTags,
        ogImage: ogimage,
      };
    }) as SingleListData[];

    response.status(200).json({ data: finalData, error: null });
  } catch (error) {
    console.error("Unexpected error in search-bookmarks:", error);
    Sentry.captureException(error, {
      tags: {
        operation: "search-bookmarks_unexpected",
      },
    });
    response.status(500).json({
      data: null,
      error: { message: "An unexpected error occurred" },
    });
  }
}
