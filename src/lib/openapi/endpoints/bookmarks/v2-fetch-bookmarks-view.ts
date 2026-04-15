import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchBookmarksViewSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Returns the category_views column for the given category_id, scoped to the authenticated user. Pass category_id as a query parameter.",
  method: "get",
  parameterExamples: {
    category_id: {
      "nonexistent-category": {
        description: "Send `?category_id=999999` — returns an empty data array.",
        summary: "Nonexistent category ID",
        value: "999999",
      },
      "with-view-data": {
        description:
          "Send `?category_id=724` (substitute a real category ID) — returns the category_views object.",
        summary: "Category with view settings",
        value: "724",
      },
    },
  },
  path: "/v2/bookmark/fetch-bookmarks-view",
  response400Examples: {
    "invalid-category-id-type": {
      description: "Send `?category_id=abc` — returns 400: expected number.",
      summary: "Invalid category_id type",
      value: {
        error: "Invalid input: expected number, received nan",
      } as const,
    },
    "missing-category-id": {
      description: "Omit the `category_id` query parameter — returns 400.",
      summary: "Missing category_id",
      value: {
        error: "Invalid input: expected number, received nan",
      } as const,
    },
  },
  responseExamples: {
    "nonexistent-category": {
      description: "Send `?category_id=999999` — returns an empty array.",
      summary: "Nonexistent category ID",
      value: [] as const,
    },
    "null-views": {
      description: "Category with no view settings — category_views is null.",
      summary: "Category with null view settings",
      value: [{ category_views: null }] as const,
    },
    "with-view-data": {
      description:
        "Send `?category_id=724` (substitute a real category ID) — returns the category_views JSON object.",
      summary: "Category with view settings",
      value: [
        {
          category_views: {
            bookmarksView: "moodboard",
            cardContentViewArray: ["cover", "title", "info"],
            moodboardColumns: [30],
            sortBy: "date-sort-ascending",
          },
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch bookmark view settings for a category",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
