import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient, getApiUser } from "@/lib/supabase/api";
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
  UNCATEGORIZED_URL,
  VIDEOS_URL,
]);

/**
 * Checks if a category_id represents a user's collection (not a special URL).
 * Ported from helpers.ts isUserInACategoryInApi.
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

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { category_id: categoryId, offset, search } = input;

      // Auth derivation: isDiscoverPage = (categoryId === DISCOVER_URL).
      // categoryId is a client-provided query param, but the comparison is against
      // the well-known constant "discover". An attacker setting category_id=discover
      // only triggers the public-bookmarks code path (no private data exposed).
      // Non-discover paths require valid user auth — failure throws RecollectApiError("unauthorized").
      const isDiscoverPage = categoryId === DISCOVER_URL;

      let supabase;
      let userId = "";
      let userEmail = "";

      if (isDiscoverPage) {
        const client = await createApiClient();
        ({ supabase } = client);
      } else {
        const { supabase: sc, token } = await createApiClient();
        const {
          data: { user },
          error: userError,
        } = await getApiUser(sc, token);
        if (userError) {
          throw new RecollectApiError("unauthorized", { message: userError.message });
        }
        if (!user) {
          throw new RecollectApiError("unauthorized", { message: "Not authenticated" });
        }
        supabase = sc;
        userId = user.id;
        userEmail = user.email ?? "";

        // Manually set user_id in ALS context (withPublic doesn't do this)
        const alsCtx = getServerContext();
        if (alsCtx) {
          alsCtx.user_id = userId;
        }
      }

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.is_discover = isDiscoverPage;
        ctx.fields.category_id = categoryId;
        ctx.fields.offset = offset;
      }

      // Parse search modifiers: @domain.com site scope and #tag filters
      const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
      const urlScope = matchedSiteScope?.at(0)?.replace("@", "")?.toLowerCase() ?? "";

      const searchText = search
        .replace(GET_SITE_SCOPE_PATTERN, "")
        .replace(GET_HASHTAG_TAG_PATTERN, "")
        .trim();

      const tagName = extractTagNames(search);

      if (ctx?.fields) {
        ctx.fields.search_text = searchText || null;
        ctx.fields.tag_name = tagName?.at(0) ?? null;
        ctx.fields.url_scope = urlScope || null;
      }

      // Determine category_scope for junction table filtering
      // Only set for numeric category IDs, not special URLs (IMAGES_URL, VIDEOS_URL, etc.)
      const userInCollections = isUserCollection(categoryId ?? "");
      let categoryScope: number | undefined;
      if (userInCollections) {
        categoryScope = categoryId === UNCATEGORIZED_URL ? 0 : Number(categoryId);
      }

      const isTrashPage = categoryId === TRASH_URL;
      let rpcQuery = supabase
        .rpc("search_bookmarks_url_tag_scope", {
          category_scope: isDiscoverPage ? undefined : categoryScope,
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
          rpcQuery = rpcQuery.filter("user_id", "eq", userId);
        }

        if (userInCollections && categoryScope !== undefined) {
          // Check if user is the owner or ANY-level collaborator (including read-only)
          // If not, scope search results to only their own bookmarks
          const hasAccess = await isUserOwnerOrAnyCollaborator({
            categoryId: categoryScope,
            email: userEmail,
            supabase,
            userId,
          });

          if (!hasAccess) {
            rpcQuery = rpcQuery.filter("user_id", "eq", userId);
          }
        }
      }

      const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(categoryId);
      if (mediaCategoryPredicate) {
        rpcQuery = rpcQuery.or(mediaCategoryPredicate);
      }

      if (categoryId === TWEETS_URL) {
        rpcQuery = rpcQuery.filter("type", "eq", tweetType);
      }

      if (categoryId === INSTAGRAM_URL) {
        rpcQuery = rpcQuery.filter("type", "eq", instagramType);
      }

      if (categoryId === LINKS_URL) {
        rpcQuery = rpcQuery.filter("type", "eq", bookmarkType);
      }

      const { data, error } = await rpcQuery;

      if (error) {
        if (ctx?.fields) {
          ctx.fields.rpc_error_message = error.message;
          ctx.fields.rpc_error_code = error.code;
        }

        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Error executing search query",
          operation: "search_bookmarks",
        });
      }

      if (ctx?.fields) {
        ctx.fields.results_count = data?.length ?? 0;
        ctx.fields.has_tag_filter = tagName !== undefined && tagName.length > 0;
      }

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

      // NextResponse escape hatch: RPC returns dynamic columns that can't be statically typed
      // to match the output schema. The camelCase mapping produces a valid shape at runtime.
      return NextResponse.json(mappedResults);
    },
    inputSchema: SearchBookmarksInputSchema,
    outputSchema: SearchBookmarksOutputSchema,
    route: ROUTE,
  }),
);
