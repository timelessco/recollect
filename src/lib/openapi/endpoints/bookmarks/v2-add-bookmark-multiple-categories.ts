import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddBookmarkMultipleCategoriesSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request body — missing URL, invalid category IDs, or empty result",
    },
    403: {
      description:
        "User lacks update access or is not the owner/collaborator of one or more target categories",
    },
  },
  description:
    "Creates a bookmark from a URL and assigns it to multiple categories in one request. Scrapes Open Graph data, detects media type, checks iframe embedding, inserts into the database with junction table entries for all provided category IDs, and fires background enrichment via after() for media URLs only.",
  method: "post",
  path: "/v2/bookmark/add-bookmark-multiple-categories",
  requestExamples: {
    "add-to-multiple-categories": {
      description:
        "Send with multiple `category_ids` — verifies ownership/collaborator access for each before inserting.",
      summary: "Add bookmark to multiple categories",
      value: {
        category_ids: [5, 12, 23],
        update_access: true,
        url: "https://example.com/article",
      } as const,
    },
    "add-to-single-category": {
      description: "Send with a single `category_ids` entry — behaves like add-bookmark-min-data.",
      summary: "Add bookmark to one category",
      value: {
        category_ids: [5],
        update_access: true,
        url: "https://example.com/photo.png",
      } as const,
    },
  },
  response400Examples: {
    "missing-url": {
      description: "Send without `url` — returns 400.",
      summary: "Missing URL",
      value: {
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
  },
  responseExamples: {
    "bookmark-created": {
      description:
        "Bookmark created with OG metadata and assigned to all requested categories. Media URLs trigger background enrichment.",
      summary: "Bookmark created successfully",
      value: [
        {
          category_id: 0,
          description: "An example article description",
          id: 42,
          inserted_at: "2026-03-27T00:00:00.000Z",
          meta_data: {
            favIcon: "https://example.com/favicon.ico",
            iframeAllowed: null,
            isOgImagePreferred: false,
            mediaType: null,
          },
          ogImage: "https://example.com/og-image.jpg",
          title: "Example Article",
          type: "bookmark",
          url: "https://example.com/article",
          user_id: "user-uuid",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Add a bookmark to multiple categories with OG scraping and conditional enrichment",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
