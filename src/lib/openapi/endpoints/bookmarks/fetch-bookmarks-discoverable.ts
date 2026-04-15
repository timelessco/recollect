/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const fetchBookmarksDiscoverableSupplement = {
  additionalResponses: {
    500: { description: "Server error" },
  },
  description:
    "Returns a paginated list of all bookmarks marked as discoverable across all users. No authentication required. Results are ordered by make_discoverable timestamp ascending. Page size is fixed at the server's PAGINATION_LIMIT (typically 20 items).",
  method: "get",
  path: "/bookmark/fetch-bookmarks-discoverable",
  responseExample: {
    data: [
      {
        description: "The latest AI research from OpenAI",
        id: 101,
        inserted_at: "2024-03-15T10:30:00Z",
        make_discoverable: "2024-03-15T12:00:00Z",
        meta_data: null,
        ogImage: "https://openai.com/og.png",
        screenshot: null,
        sort_index: "a0",
        title: "OpenAI Research Blog",
        trash: null,
        type: "article",
        url: "https://openai.com/research",
        user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
    ],
    error: null,
  },
  security: [],
  summary: "List discoverable bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
