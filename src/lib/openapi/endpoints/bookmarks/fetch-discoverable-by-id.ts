/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const fetchDiscoverableByIdSupplement = {
  additionalResponses: {
    404: { description: "Bookmark not found or not discoverable" },
    500: { description: "Server error" },
  },
  description:
    "Fetches a single discoverable bookmark by ID, including its tags and categories. No authentication required. Returns 404 if the bookmark does not exist or is not discoverable.",
  method: "get",
  path: "/bookmark/fetch-discoverable-by-id",
  responseExample: {
    data: {
      addedCategories: [
        {
          category_name: "AI Research",
          category_slug: "ai-research",
          icon: "brain",
          icon_color: "#6366f1",
          id: 7,
        },
      ],
      addedTags: [{ id: 3, name: "ai" }],
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
    },
    error: null,
  },
  security: [],
  summary: "Get a single discoverable bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
