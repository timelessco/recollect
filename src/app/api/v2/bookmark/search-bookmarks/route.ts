import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createApiClient, getApiUser } from "@/lib/supabase/api";
import { getBookmarkMediaCategoryPredicate } from "@/utils/bookmark-category-filters";
import { isUserOwnerOrAnyCollaborator } from "@/utils/category-auth";
import {
  AUDIO_URL,
  bookmarkType,
  DISCOVER_URL,
  DOCUMENTS_URL,
  GET_SITE_SCOPE_PATTERN,
  IMAGES_URL,
  instagramType,
  INSTAGRAM_URL,
  LINKS_URL,
  PAGINATION_LIMIT,
  TRASH_URL,
  tweetType,
  TWEETS_URL,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
} from "@/utils/constants";
import { parseSearchTokens } from "@/utils/searchTokens";
import { toJson } from "@/utils/type-utils";

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
 * Two audiences, one URL. The search bar lives on public discover pages
 * (no user) AND user collections (require identity for ownership +
 * collaborator scoping).
 *
 * Why not two routes: would duplicate the shared RPC + token-parsing
 * pipeline (color hints, type hints, site scope, media-category predicates).
 * Why not `withAuth`: would 401 logged-out discover-page searches.
 * Why not `createServerServiceClient()`: would strip the `user.id` /
 * `user.email` the authed branch needs for `user_id` filtering and
 * `isUserOwnerOrAnyCollaborator` checks.
 *
 * So: `withPublic` + branch on `category_id === DISCOVER_URL`. Discover is
 * fully anon. Every other branch calls `getApiUser()` and fails closed with
 * `unauthorized` if no session is present.
 *
 * Spoof safety: `category_id` is caller-provided, but `DISCOVER_URL` matches
 * only the `make_discoverable IS NOT NULL` filter path below. Setting
 * `category_id=discover` reaches public data only — no per-user rows are
 * reachable through the discover branch.
 *
 * See pitfall #34 in .claude/agents/references/api-migration-pitfalls.md for
 * when this conditional-auth pattern is justified vs. when to prefer
 * `withAuth` or a service client outright.
 */
export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { category_id: categoryId, offset, search } = input;

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
        ctx.fields.category_id = categoryId;
      }
      setPayload(ctx, {
        is_discover: isDiscoverPage,
        offset,
      });

      // Parse search modifiers: @domain.com site scope, then #-tokens (plain tags + color hints)
      const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
      const urlScope = matchedSiteScope?.at(0)?.replace("@", "")?.toLowerCase() ?? "";

      const searchWithoutSiteScope = search.replace(GET_SITE_SCOPE_PATTERN, "");
      const {
        text: searchText,
        plainTags,
        colorHints,
        typeHints,
      } = parseSearchTokens(searchWithoutSiteScope);
      const tagName = plainTags.length > 0 ? plainTags : undefined;

      setPayload(ctx, {
        has_search_text: searchText.length > 0,
        search_text_length: searchText.length,
        has_tag_filter: tagName !== undefined && tagName.length > 0,
        url_scope: urlScope || null,
      });

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
          color_hints: toJson(
            colorHints.map((h) => ({
              tag_name: h.tagName,
              l: h.oklab.l,
              a: h.oklab.a,
              b: h.oklab.b,
            })),
          ),
          search_text: searchText,
          tag_scope: tagName,
          type_hints: typeHints.length > 0 ? typeHints : undefined,
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
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Error executing search query",
          operation: "search_bookmarks",
        });
      }

      setPayload(ctx, {
        results_count: data?.length ?? 0,
        has_tag_filter: tagName !== undefined && tagName.length > 0,
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

      // NextResponse escape hatch: RPC returns dynamic columns that can't be statically typed
      // to match the output schema. The camelCase mapping produces a valid shape at runtime.
      return NextResponse.json(mappedResults);
    },
    inputSchema: SearchBookmarksInputSchema,
    outputSchema: SearchBookmarksOutputSchema,
    route: ROUTE,
  }),
);
