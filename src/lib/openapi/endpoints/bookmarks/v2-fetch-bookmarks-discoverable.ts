/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchBookmarksDiscoverableSupplement = {
  additionalResponses: {
    503: { description: "Database error" },
  },
  description:
    "Returns a paginated list of all bookmarks marked as discoverable across all users. No authentication required — logged-in and logged-out callers receive identical responses. Results are ordered by `make_discoverable` timestamp ascending. Page size is fixed at the server's `PAGINATION_LIMIT` (25 items).",
  method: "get",
  parameterExamples: {
    page: {
      "beyond-end": {
        description:
          "Send `?page=10` when there are fewer than 250 discoverable bookmarks — returns an empty array.",
        summary: "Page beyond end",
        value: "10",
      },
      "first-page": {
        description:
          "Send `?page=0` — returns first PAGINATION_LIMIT (25) discoverable bookmarks ordered by make_discoverable ascending.",
        summary: "First page (full)",
        value: "0",
      },
      "partial-page": {
        description:
          "Send `?page=1` — returns the tail of the discoverable feed (fewer than 25 items when fewer bookmarks remain).",
        summary: "Partial page",
        value: "1",
      },
    },
  },
  path: "/v2/bookmark/fetch-bookmarks-discoverable",
  response400Examples: {
    "missing-page": {
      description: "Omit the `page` query parameter entirely — returns 400.",
      summary: "Missing page parameter",
      value: {
        error: "Invalid input: expected number, received NaN",
      } as const,
    },
    "negative-page": {
      description: "Send `?page=-1` — returns 400 (page must be non-negative).",
      summary: "Negative page parameter",
      value: {
        error: "Too small: expected number to be >=0",
      } as const,
    },
    "non-integer-page": {
      description: "Send `?page=1.5` — returns 400 (page must be an integer).",
      summary: "Non-integer page parameter",
      value: {
        error: "Invalid input: expected int, received number",
      } as const,
    },
  },
  responseExamples: {
    "empty-page": {
      description:
        "Send `?page=10` past the last populated page — returns an empty array (no error).",
      summary: "Empty page",
      value: [] as const,
    },
    "happy-path": {
      description:
        "Send `?page=0` — returns up to 25 discoverable bookmarks. Public feed: identical response for logged-in and logged-out callers. Nullable fields (title, description, screenshot, sort_index, trash) may be null per row.",
      summary: "Discoverable feed (first page)",
      value: [
        {
          description: "A deep dive on modern web architecture",
          id: 8838,
          inserted_at: "2024-03-15T10:30:00.000000+00:00",
          make_discoverable: "2024-03-15T12:00:00.000000+00:00",
          meta_data: {
            favIcon: "https://example.com/favicon.svg",
            height: 630,
            width: 1200,
          },
          ogImage: "https://example.com/og/article-1.png",
          screenshot: null,
          sort_index: null,
          title: "Article One",
          trash: null,
          type: "article",
          url: "https://example.com/article-1",
        },
        {
          description: null,
          id: 8839,
          inserted_at: "2024-03-16T08:12:00.000000+00:00",
          make_discoverable: "2024-03-16T09:00:00.000000+00:00",
          meta_data: null,
          ogImage: "https://example.com/og/article-2.png",
          screenshot: null,
          sort_index: null,
          title: null,
          trash: null,
          type: "bookmark",
          url: "https://example.com/article-2",
        },
      ] as const,
    },
  },
  security: [],
  summary: "List discoverable bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
