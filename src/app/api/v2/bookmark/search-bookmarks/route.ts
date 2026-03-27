import type { NextRequest } from "next/server";

import type { HandlerConfig } from "@/lib/api-helpers/create-handler";

import { apiError, apiSuccess, parseQuery } from "@/lib/api-helpers/response";
import { createApiClient, requireAuth } from "@/lib/supabase/api";
import { getBookmarkMediaCategoryPredicate } from "@/utils/bookmark-category-filters";
import { isUserOwnerOrAnyCollaborator } from "@/utils/category-auth";
import {
  AUDIO_URL,
  bookmarkType,
  DISCOVER_URL,
  DOCUMENTS_URL,
  GET_HASHTAG_TAG_PATTERN,
  GET_SITE_SCOPE_PATTERN,
  IMAGES_URL,
  instagramType,
  INSTAGRAM_URL,
  LINKS_URL,
  PAGINATION_LIMIT,
  TAG_MARKUP_REGEX,
  TRASH_URL,
  tweetType,
  TWEETS_URL,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
} from "@/utils/constants";

import { SearchBookmarksInputSchema, SearchBookmarksOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-search-bookmarks";

// Special category URLs that are NOT user collections
const SPECIAL_CATEGORY_URLS = new Set([
  AUDIO_URL,
  DOCUMENTS_URL,
  IMAGES_URL,
  INSTAGRAM_URL,
  LINKS_URL,
  TRASH_URL,
  TWEETS_URL,
  VIDEOS_URL,
]);

/**
 * Checks if a category_id represents a user's collection (not a special URL).
 * Ported from helpers.ts isUserInACategoryInApi (without uncategorized check).
 */
function isUserCollection(categoryId: string): boolean {
  return categoryId !== "null" && categoryId !== "" && !SPECIAL_CATEGORY_URLS.has(categoryId);
}

/**
 * Extracts tag names from search query (e.g., "#typescript" -> ["typescript"]).
 * Ported from helpers.ts extractTagNamesFromSearch.
 */
function extractTagNames(search: string): string[] | undefined {
  if (search.length === 0) {
    return undefined;
  }

  const matches = search.match(GET_HASHTAG_TAG_PATTERN);
  if (!matches || matches.length === 0) {
    return undefined;
  }

  const tagNames = matches
    .map((item) => {
      const markupMatch = TAG_MARKUP_REGEX.exec(item);
      const display = markupMatch?.groups?.display;
      return display ?? item.replace("#", "");
    })
    .filter((tag): tag is string => typeof tag === "string" && tag.length > 0);

  return tagNames.length === 0 ? undefined : tagNames;
}

async function handleGet(request: NextRequest) {
  try {
    const query = parseQuery({ request, route: ROUTE, schema: SearchBookmarksInputSchema });
    if (query.errorResponse) {
      return query.errorResponse;
    }

    const { category_id: categoryId, offset, search } = query.data;
    const isDiscoverPage = categoryId === DISCOVER_URL;

    let supabase;
    let userId = "";
    let userEmail = "";

    if (isDiscoverPage) {
      const client = await createApiClient();
      ({ supabase } = client);
    } else {
      const auth = await requireAuth(ROUTE);
      if (auth.errorResponse) {
        return auth.errorResponse;
      }
      ({ supabase } = auth);
      userId = auth.user.id;
      userEmail = auth.user.email ?? "";
    }

    console.log(`[${ROUTE}] API called:`, {
      category_id: categoryId,
      limit: PAGINATION_LIMIT,
      offset,
      rawSearch: search,
    });

    // Parse search modifiers: @domain.com site scope and #tag filters
    const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
    const urlScope = matchedSiteScope?.at(0)?.replace("@", "")?.toLowerCase() ?? "";

    const searchText = search
      .replace(GET_SITE_SCOPE_PATTERN, "")
      .replace(GET_HASHTAG_TAG_PATTERN, "")
      .trim();

    const tagName = extractTagNames(search);

    // Determine category_scope for junction table filtering
    // Only set for numeric category IDs, not special URLs (IMAGES_URL, VIDEOS_URL, etc.)
    const userInCollections = isUserCollection(categoryId ?? "");
    let categoryScope: null | number = null;
    if (userInCollections) {
      categoryScope = categoryId === UNCATEGORIZED_URL ? 0 : Number(categoryId);
    }

    console.log(`[${ROUTE}] Parsed search parameters:`, {
      categoryScope,
      searchText,
      tagName,
      urlScope,
    });

    const isTrashPage = categoryId === TRASH_URL;
    let rpcQuery = supabase
      .rpc("search_bookmarks_url_tag_scope", {
        category_scope: isDiscoverPage ? null : categoryScope,
        search_text: searchText,
        tag_scope: tagName,
        url_scope: urlScope,
      })
      .range(offset, offset + PAGINATION_LIMIT - 1);

    // Filter by trash status: trash IS NULL for non-trash, trash IS NOT NULL for trash page
    rpcQuery = isTrashPage ? rpcQuery.not("trash", "is", null) : rpcQuery.is("trash", null);

    if (isDiscoverPage) {
      rpcQuery = rpcQuery.not("make_discoverable", "is", null);
    } else {
      if (!userInCollections) {
        rpcQuery = rpcQuery.eq("user_id", userId);
      }

      if (userInCollections) {
        // Check if user is the owner or ANY-level collaborator (including read-only)
        // If not, scope search results to only their own bookmarks
        const hasAccess = await isUserOwnerOrAnyCollaborator({
          categoryId: Number(categoryId),
          email: userEmail,
          supabase,
          userId: userId,
        });

        if (!hasAccess) {
          rpcQuery = rpcQuery.eq("user_id", userId);
        }
      }
    }

    const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(categoryId);
    if (mediaCategoryPredicate) {
      rpcQuery = rpcQuery.or(mediaCategoryPredicate);
    }

    if (categoryId === TWEETS_URL) {
      rpcQuery = rpcQuery.eq("type", tweetType);
    }

    if (categoryId === INSTAGRAM_URL) {
      rpcQuery = rpcQuery.eq("type", instagramType);
    }

    if (categoryId === LINKS_URL) {
      rpcQuery = rpcQuery.eq("type", bookmarkType);
    }

    const { data, error } = await rpcQuery;

    if (error) {
      console.error(`[${ROUTE}] Error executing search query:`, {
        category_id: categoryId,
        error,
        rawSearch: search,
        tagName,
        urlScope,
      });
      return apiError({
        error,
        extra: { category_id: categoryId, rawSearch: search },
        message: "Error executing search query",
        operation: "search_bookmarks",
        route: ROUTE,
        userId: userId || null,
      });
    }

    if (!data || data.length === 0) {
      console.warn(`[${ROUTE}] No data returned from search:`, {
        searchText,
        tagName,
        urlScope,
      });
    }

    console.log(`[${ROUTE}] Search query succeeded:`, {
      category_id: categoryId,
      hasTagFilter: tagName !== undefined && tagName.length > 0,
      resultsCount: data?.length ?? 0,
    });

    // Map RPC snake_case fields to camelCase (Pitfall 7)
    // Widen to Record to handle overloaded RPC return union — output schema validates at runtime
    const mappedResults = (data ?? []).map((item) => {
      const row = item as Record<string, unknown>;
      const { added_categories, added_tags, ogimage, ...rest } = row;

      return {
        ...rest,
        addedCategories: added_categories ?? null,
        addedTags: added_tags ?? null,
        ogImage: ogimage ?? null,
      };
    });

    return apiSuccess({ data: mappedResults, route: ROUTE, schema: SearchBookmarksOutputSchema });
  } catch (error) {
    return apiError({
      error,
      message: "An unexpected error occurred",
      operation: "search_bookmarks_unexpected",
      route: ROUTE,
    });
  }
}

export const GET = Object.assign(handleGet, {
  config: {
    factoryName: "createGetApiHandler",
    inputSchema: SearchBookmarksInputSchema,
    outputSchema: SearchBookmarksOutputSchema,
    route: ROUTE,
  } satisfies HandlerConfig,
});
