import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2BookmarksInsertSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or empty bookmarks array" },
  },
  description:
    "Accepts an array of bookmark objects and inserts them with the authenticated user's ID. Used by the Chrome extension for bulk bookmark import. Returns the count of successfully inserted bookmarks.",
  method: "post",
  path: "/v2/bookmarks/insert",
  requestExamples: {
    "multiple-bookmarks": {
      description: "Batch insert with two bookmarks including metadata.",
      summary: "Insert multiple bookmarks",
      value: {
        data: [
          {
            description: "Where the world builds software",
            ogImage:
              "https://github.githubassets.com/images/modules/site/social-cards/github-social.png",
            title: "GitHub",
            type: "link",
            url: "https://github.com",
          },
          {
            description: "Resources for developers, by developers",
            ogImage: null,
            title: "MDN Web Docs",
            type: "link",
            url: "https://developer.mozilla.org",
          },
        ],
      } as const,
    },
    "single-bookmark": {
      description: "Minimal payload with a single bookmark.",
      summary: "Insert one bookmark",
      value: {
        data: [
          {
            description: null,
            ogImage: null,
            title: "Example Site",
            type: null,
            url: "https://example.com",
          },
        ],
      } as const,
    },
  },
  response400Examples: {
    "empty-array": {
      description: "Fails when the data array has no elements.",
      summary: "Empty bookmarks array",
      value: {
        error: "data: Array must contain at least 1 element(s)",
      } as const,
    },
    "missing-url": {
      description: "Fails when a bookmark object is missing the url field.",
      summary: "Missing required URL field",
      value: {
        error: "data[0].url: Required",
      } as const,
    },
  },
  responseExamples: {
    "batch-insert": {
      description: "Successfully inserted two bookmarks in a batch.",
      summary: "Multiple bookmarks inserted",
      value: { insertedCount: 2 } as const,
    },
    "single-insert": {
      description: "Successfully inserted a single bookmark.",
      summary: "One bookmark inserted",
      value: { insertedCount: 1 } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Batch insert bookmarks for the authenticated user",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
