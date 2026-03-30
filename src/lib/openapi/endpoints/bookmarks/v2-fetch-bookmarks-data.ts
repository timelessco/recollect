import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchBookmarksDataSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Returns paginated bookmarks with stitched tags and categories from junction tables. Supports category-scoped queries (numeric ID, trash, tweets, links, instagram, uncategorized), collaborator/owner permission checks for shared categories, dynamic sort ordering, and media type filtering.",
  method: "get",
  parameterExamples: {
    category_id: {
      "numeric-category": {
        description: "Send `?category_id=724` — returns bookmarks in that category.",
        summary: "Numeric category ID",
        value: "724",
      },
      "trash-page": {
        description:
          "Send `?category_id=trash` — returns trashed bookmarks sorted by trash timestamp.",
        summary: "Trash category",
        value: "trash",
      },
      "uncategorized-page": {
        description: "Send `?category_id=uncategorized` — returns bookmarks with category_id 0.",
        summary: "Uncategorized bookmarks",
        value: "uncategorized",
      },
    },
    from: {
      "first-page": {
        description: "Send `?from=0` — returns the first page of bookmarks.",
        summary: "First page",
        value: "0",
      },
      "second-page": {
        description: "Send `?from=25` — returns the second page (offset 25).",
        summary: "Second page",
        value: "25",
      },
    },
    sort_by: {
      "newest-first": {
        description: "Send `?sort_by=date-sort-ascending` — newest bookmarks first.",
        summary: "Newest first",
        value: "date-sort-ascending",
      },
      "title-az": {
        description: "Send `?sort_by=alphabetical-sort-ascending` — title A-Z.",
        summary: "Title A-Z",
        value: "alphabetical-sort-ascending",
      },
    },
  },
  path: "/v2/bookmark/fetch-bookmarks-data",
  response400Examples: {
    "missing-category-id": {
      description: "Omit the `category_id` query parameter — returns 400.",
      summary: "Missing category_id",
      value: {
        error: "Invalid input: Required",
      } as const,
    },
  },
  responseExamples: {
    "empty-category": {
      description: "Category with no bookmarks returns an empty array.",
      summary: "Empty category",
      value: [] as const,
    },
    "with-bookmarks": {
      description: "Returns bookmarks with stitched tags and categories arrays.",
      summary: "Bookmarks with tags and categories",
      value: [
        {
          categories: [
            {
              category_name: "Design",
              category_slug: "design",
              icon: "palette",
              icon_color: "#6366f1",
              id: 724,
            },
          ],
          category_id: 724,
          description: "A comprehensive guide to modern CSS",
          enriched_at: "2025-01-15T10:30:00+00:00",
          enrichment_status: "completed",
          id: 42,
          inserted_at: "2025-01-15T10:00:00+00:00",
          make_discoverable: null,
          meta_data: null,
          ogImage: "https://example.com/og.png",
          screenshot: "https://example.com/screenshot.png",
          sort_index: null,
          tags: [
            { id: 1, name: "css" },
            { id: 2, name: "frontend" },
          ],
          title: "Modern CSS Guide",
          trash: null,
          type: "bookmark",
          url: "https://example.com/css-guide",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch paginated bookmarks with tags and categories",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
