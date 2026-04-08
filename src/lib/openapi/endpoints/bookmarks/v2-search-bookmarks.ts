import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2SearchBookmarksSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid search query parameter, or malformed cursor" },
    401: { description: "Authentication required for non-discover page searches" },
  },
  description:
    "Searches bookmarks via two-phase RPCs: search_bookmarks_url_tag_scope (tag phase) then search_bookmarks_color_array_scope (color phase). Every #token is a tag candidate; tokens that parse as a CSS color name or hex are also color candidates. Pagination is opaque cursor-based — pass back next_cursor from the previous response. Auth is conditional: discover page is public, all other contexts require auth.",
  method: "get",
  parameterExamples: {
    category_id: {
      "discover-page": {
        description: "Use the discover category ID for public search.",
        summary: "Public discover page search",
        value: "discover",
      },
      "user-category": {
        description: "Numeric category ID for auth-scoped search within a collection.",
        summary: "Search within user category",
        value: "42",
      },
    },
    cursor: {
      "first-page": {
        description: "Empty (or omitted) returns the first page.",
        summary: "First page",
        value: "",
      },
      "next-page": {
        description: "Pass back the next_cursor value from the previous response. Treat as opaque.",
        summary: "Subsequent page",
        value: "eyJwaGFzZSI6InRhZyIsIm9mZnNldCI6MjB9",
      },
    },
    search: {
      "hash-color-name": {
        description:
          "Color search by name. If a tag with the same name exists, tag results page first.",
        summary: "Color by name",
        value: "#blue",
      },
      "hash-hex": {
        description:
          "Color search by hex. Tag query for the literal name 'ff0000' also runs (typically empty).",
        summary: "Color by hex",
        value: "#ff0000",
      },
      "hashtag-filter": {
        description: "Plain tag — token is not a CSS color so the color phase is skipped.",
        summary: "Tag filter",
        value: "#typescript",
      },
      "multi-color-and": {
        description: "Two or more #color tokens are an AND match — all colors must be present.",
        summary: "Multi-color AND",
        value: "#red #blue",
      },
      "site-scope": {
        description: "Prefix with @ to scope search to a specific domain.",
        summary: "Site scope",
        value: "@github.com react hooks",
      },
      "text-search": {
        description: "Plain text search across titles, descriptions, and URLs.",
        summary: "Basic text search",
        value: "react hooks",
      },
    },
  },
  path: "/v2/bookmark/search-bookmarks",
  response400Examples: {
    "invalid-cursor": {
      description: "Send a malformed cursor — returns 400.",
      summary: "Invalid cursor",
      value: { error: "invalid cursor: not base64url" } as const,
    },
    "missing-search": {
      description: "Send without search — returns 400.",
      summary: "Missing search",
      value: { error: "Search parameter is required" } as const,
    },
  },
  responseExamples: {
    "final-page": {
      description: "Final page — next_cursor is null.",
      summary: "Final page",
      value: { items: [], next_cursor: null } as const,
    },
    "search-results": {
      description: "Matching bookmarks with camelCase mapping. next_cursor is opaque.",
      summary: "Search results page",
      value: {
        items: [
          {
            addedCategories: null,
            addedTags: null,
            description: "A guide to React hooks",
            id: 123,
            inserted_at: "2025-01-15T10:30:00+00:00",
            make_discoverable: null,
            meta_data: {},
            ogImage: "https://example.com/og-image.jpg",
            screenshot: null,
            sort_index: "0",
            title: "React Hooks Guide",
            trash: null,
            type: "bookmark",
            url: "https://example.com/react-hooks",
            user_id: "user-uuid-123",
          },
        ],
        next_cursor: "eyJwaGFzZSI6InRhZyIsIm9mZnNldCI6MjB9",
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Search bookmarks with cursor pagination (two-phase tag → color)",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
