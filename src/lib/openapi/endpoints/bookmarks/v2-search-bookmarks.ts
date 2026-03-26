import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2SearchBookmarksSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid search query parameter" },
    401: { description: "Authentication required for non-discover page searches" },
  },
  description:
    "Searches bookmarks using the search_bookmarks_url_tag_scope RPC with support for text search, @domain.com site scope, and #tag filters. Auth is conditional: discover page searches are public, all other category contexts require authentication. Results include category ownership and collaborator access checks.",
  method: "get",
  parameterExamples: {
    category_id: {
      "discover-page": {
        description: "Use the discover category ID for public search — no auth required.",
        summary: "Public discover page search",
        value: "discover",
      },
      "user-category": {
        description:
          "Use a numeric category ID for auth-scoped search within a specific collection.",
        summary: "Search within user category",
        value: "42",
      },
    },
    search: {
      "hashtag-filter": {
        description: "Prefix with # to filter by tag name within search results.",
        summary: "Search with tag filter",
        value: "#typescript",
      },
      "site-scope": {
        description: "Prefix with @ to scope search to a specific domain.",
        summary: "Search with site scope",
        value: "@github.com react hooks",
      },
      "text-search": {
        description: "Plain text search across bookmark titles, descriptions, and URLs.",
        summary: "Basic text search",
        value: "react hooks",
      },
    },
  },
  path: "/v2/bookmark/search-bookmarks",
  response400Examples: {
    "missing-search": {
      description: "Send without `search` query parameter — returns 400.",
      summary: "Missing search query",
      value: {
        data: null,
        error: "Search parameter is required",
      } as const,
    },
  },
  responseExamples: {
    "search-results": {
      description:
        "Matching bookmarks with camelCase field mapping applied (ogimage → ogImage, added_categories → addedCategories, added_tags → addedTags).",
      summary: "Search results with camelCase mapping",
      value: {
        data: [
          {
            addedCategories: null,
            addedTags: null,
            description: "A guide to React hooks for state management",
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
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Search bookmarks with conditional auth (discover page is public)",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
