import { NextResponse } from "next/server";

import type { SearchCursor } from "@/utils/search-cursor";

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
  TRASH_URL,
  tweetType,
  TWEETS_URL,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
} from "@/utils/constants";
import { decodeSearchCursor, encodeSearchCursor } from "@/utils/search-cursor";
import { classifySearchTokens } from "@/utils/search-tokens";

import { SearchBookmarksInputSchema, SearchBookmarksOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-search-bookmarks";

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

function isUserCollection(categoryId: string): boolean {
  return categoryId !== "null" && categoryId !== "" && !SPECIAL_CATEGORY_URLS.has(categoryId);
}

function mapRow(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object") {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "added_categories") {
      out.addedCategories = v ?? null;
    } else if (k === "added_tags") {
      out.addedTags = v ?? null;
    } else if (k === "ogimage") {
      out.ogImage = v ?? null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { category_id: categoryId, cursor: rawCursor, search } = input;
      const isDiscoverPage = categoryId === DISCOVER_URL;

      const client = await createApiClient();
      const { supabase } = client;
      let userId = "";
      let userEmail = "";

      if (!isDiscoverPage) {
        const {
          data: { user },
          error: userError,
        } = await getApiUser(supabase, client.token);
        if (userError) {
          throw new RecollectApiError("unauthorized", { message: userError.message });
        }
        if (!user) {
          throw new RecollectApiError("unauthorized", { message: "Not authenticated" });
        }
        userId = user.id;
        userEmail = user.email ?? "";

        const alsCtx = getServerContext();
        if (alsCtx) {
          alsCtx.user_id = userId;
        }
      }

      let cursor: SearchCursor;
      try {
        cursor = decodeSearchCursor(rawCursor);
      } catch (error) {
        throw new RecollectApiError("bad_request", {
          cause: error instanceof Error ? error : undefined,
          message: error instanceof Error ? error.message : "invalid cursor",
          operation: "search_bookmarks_decode_cursor",
        });
      }

      const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
      const urlScope = matchedSiteScope?.at(0)?.replace("@", "")?.toLowerCase() ?? "";

      const { colorTokens, tagTokens } = classifySearchTokens(search);

      const searchText = search
        .replace(GET_SITE_SCOPE_PATTERN, "")
        .replace(GET_HASHTAG_TAG_PATTERN, "")
        .trim();

      // Stale cursor recovery: if client says color phase but tokenization
      // has no color tokens (search query changed under them), reset to tag.
      if (cursor.phase === "color" && colorTokens.length === 0) {
        cursor = { offset: 0, phase: "tag" };
      }

      const userInCollections = isUserCollection(categoryId ?? "");
      let categoryScope: number | undefined;
      if (userInCollections) {
        categoryScope = categoryId === UNCATEGORIZED_URL ? 0 : Number(categoryId);
      }

      if (!isDiscoverPage && userInCollections && categoryScope !== undefined) {
        // Owner/collaborator gating mirrors current behavior; result of the
        // check is intentionally unused — non-collaborators see only their
        // own bookmarks via the userId scope filter applied below.
        await isUserOwnerOrAnyCollaborator({
          categoryId: categoryScope,
          email: userEmail,
          supabase,
          userId,
        });
      }

      const isTrashPage = categoryId === TRASH_URL;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.is_discover = isDiscoverPage;
        ctx.fields.category_id = categoryId;
        ctx.fields.cursor_phase = cursor.phase;
        ctx.fields.cursor_offset = cursor.offset;
        ctx.fields.tag_token_count = tagTokens.length;
        ctx.fields.color_token_count = colorTokens.length;
        ctx.fields.search_text = searchText || null;
        ctx.fields.url_scope = urlScope || null;
      }

      const items: unknown[] = [];
      let nextCursor: null | string = null;

      // ----- Phase 1: tag phase ------------------------------------------
      // Always runs in tag phase even if tagTokens is empty — it serves the
      // plain text + URL/category scope path.
      if (cursor.phase === "tag") {
        let tagQuery = supabase
          .rpc("search_bookmarks_url_tag_scope", {
            category_scope: isDiscoverPage ? undefined : categoryScope,
            color_a: undefined,
            color_b: undefined,
            color_l: undefined,
            search_text: searchText,
            tag_scope: tagTokens.length > 0 ? tagTokens : undefined,
            url_scope: urlScope,
          })
          .range(cursor.offset, cursor.offset + PAGINATION_LIMIT - 1);

        tagQuery = isTrashPage ? tagQuery.not("trash", "is", null) : tagQuery.is("trash", null);

        if (isDiscoverPage) {
          tagQuery = tagQuery.not("make_discoverable", "is", null);
        } else if (!userInCollections) {
          tagQuery = tagQuery.filter("user_id", "eq", userId);
        }

        const tagMediaPredicate = getBookmarkMediaCategoryPredicate(categoryId);
        if (tagMediaPredicate) {
          tagQuery = tagQuery.or(tagMediaPredicate);
        }
        if (categoryId === TWEETS_URL) {
          tagQuery = tagQuery.filter("type", "eq", tweetType);
        }
        if (categoryId === INSTAGRAM_URL) {
          tagQuery = tagQuery.filter("type", "eq", instagramType);
        }
        if (categoryId === LINKS_URL) {
          tagQuery = tagQuery.filter("type", "eq", bookmarkType);
        }

        const { data: tagData, error: tagError } = await tagQuery;
        if (tagError) {
          throw new RecollectApiError("service_unavailable", {
            cause: tagError,
            message: "Error executing tag-phase search",
            operation: "search_bookmarks_tag_phase",
          });
        }

        const tagResults = tagData ?? [];
        items.push(...tagResults);

        if (tagResults.length === PAGINATION_LIMIT) {
          nextCursor = encodeSearchCursor({
            offset: cursor.offset + tagResults.length,
            phase: "tag",
          });
        } else if (colorTokens.length > 0) {
          // Coalesce: tag phase under-filled, drop into color phase in same request
          cursor = { offset: 0, phase: "color" };
        }
      }

      // ----- Phase 2: color phase ----------------------------------------
      // Initial entry OR continuation from tag phase.
      if (nextCursor === null && cursor.phase === "color" && colorTokens.length > 0) {
        const remaining = PAGINATION_LIMIT - items.length;
        let colorQuery = supabase
          .rpc("search_bookmarks_color_array_scope", {
            category_scope: isDiscoverPage ? undefined : categoryScope,
            color_a: colorTokens.map((c) => c.a),
            color_b: colorTokens.map((c) => c.b),
            color_l: colorTokens.map((c) => c.l),
            exclude_tag_scope: tagTokens.length > 0 ? tagTokens : undefined,
            search_text: searchText,
            url_scope: urlScope,
          })
          .range(cursor.offset, cursor.offset + remaining - 1);

        colorQuery = isTrashPage
          ? colorQuery.not("trash", "is", null)
          : colorQuery.is("trash", null);

        if (isDiscoverPage) {
          colorQuery = colorQuery.not("make_discoverable", "is", null);
        } else if (!userInCollections) {
          colorQuery = colorQuery.filter("user_id", "eq", userId);
        }

        const colorMediaPredicate = getBookmarkMediaCategoryPredicate(categoryId);
        if (colorMediaPredicate) {
          colorQuery = colorQuery.or(colorMediaPredicate);
        }
        if (categoryId === TWEETS_URL) {
          colorQuery = colorQuery.filter("type", "eq", tweetType);
        }
        if (categoryId === INSTAGRAM_URL) {
          colorQuery = colorQuery.filter("type", "eq", instagramType);
        }
        if (categoryId === LINKS_URL) {
          colorQuery = colorQuery.filter("type", "eq", bookmarkType);
        }

        const { data: colorData, error: colorError } = await colorQuery;
        if (colorError) {
          throw new RecollectApiError("service_unavailable", {
            cause: colorError,
            message: "Error executing color-phase search",
            operation: "search_bookmarks_color_phase",
          });
        }

        const colorResults = colorData ?? [];
        items.push(...colorResults);

        nextCursor =
          colorResults.length === remaining
            ? encodeSearchCursor({
                offset: cursor.offset + colorResults.length,
                phase: "color",
              })
            : null;
      }

      if (ctx?.fields) {
        ctx.fields.results_count = items.length;
        ctx.fields.next_cursor_present = nextCursor !== null;
      }

      const mappedItems = items.map(mapRow);

      // NextResponse escape hatch: items contain dynamic RPC columns
      return NextResponse.json({ items: mappedItems, next_cursor: nextCursor });
    },
    inputSchema: SearchBookmarksInputSchema,
    outputSchema: SearchBookmarksOutputSchema,
    route: ROUTE,
  }),
);
