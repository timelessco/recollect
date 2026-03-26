/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const chromeBookmarkImportSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
  },
  description:
    "Enqueues a batch of Chrome bookmarks for async import. Deduplicates within the batch and against existing bookmarks. Returns counts of queued and skipped items.",
  method: "post",
  path: "/chrome-bookmarks/import",
  requestExamples: {
    "single-bookmark": {
      description: "Import a single Chrome bookmark with its folder as the category.",
      summary: "Single bookmark",
      value: {
        bookmarks: [
          {
            category_name: "Dev Tools",
            inserted_at: "2026-01-15T10:30:00Z",
            title: "GitHub - octocat/Hello-World",
            url: "https://github.com/octocat/Hello-World",
          },
        ],
      },
    },
    "uncategorized-bookmark": {
      description: "Import a bookmark without a Chrome folder. Will be assigned to Uncategorized.",
      summary: "Uncategorized bookmark",
      value: {
        bookmarks: [
          {
            category_name: null,
            inserted_at: "",
            title: "Example Site",
            url: "https://example.com",
          },
        ],
      },
    },
  },
  responseExamples: {
    "all-queued": {
      description: "All bookmarks were new and queued for processing.",
      summary: "All bookmarks queued",
      value: { data: { queued: 5, skipped: 0 }, error: null },
    },
    "some-skipped": {
      description: "Some bookmarks were duplicates and skipped.",
      summary: "Partial import with duplicates",
      value: { data: { queued: 3, skipped: 2 }, error: null },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Import Chrome bookmarks",
  tags: ["Chrome Bookmarks"],
} satisfies EndpointSupplement;
