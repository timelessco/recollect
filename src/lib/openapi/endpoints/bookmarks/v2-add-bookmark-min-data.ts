import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddBookmarkMinDataSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request body — missing URL, invalid category ID, or empty result",
    },
    403: {
      description:
        "User lacks update access or is not the owner/collaborator of the target category",
    },
  },
  description:
    "Creates a bookmark from a URL: scrapes Open Graph data, detects media type, checks iframe embedding, inserts into the database with junction table entry, and fires background enrichment via after() for media URLs only. Non-media URLs skip server-side enrichment (client calls the screenshot API instead).",
  method: "post",
  path: "/v2/bookmark/add-bookmark-min-data",
  requestExamples: {
    "add-to-category": {
      description:
        "Send with a valid `category_id` — verifies ownership/collaborator access before inserting.",
      summary: "Add bookmark to a specific category",
      value: {
        category_id: 5,
        update_access: true,
        url: "https://example.com/article",
      } as const,
    },
    "add-uncategorized": {
      description: "Send with `category_id: 0` — bookmark is added to the uncategorized bucket.",
      summary: "Add bookmark without category",
      value: {
        category_id: 0,
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
      description: "Bookmark created with OG metadata. Media URLs trigger background enrichment.",
      summary: "Bookmark created successfully",
      value: [
        {
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
  summary: "Add a bookmark with OG scraping, media detection, and conditional enrichment",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
