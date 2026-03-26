import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchBookmarksCountSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Returns 10 named bookmark counts (everything, images, videos, documents, links, trash, uncategorized, tweets, instagram, audio) plus a per-category count array. All counts are scoped to the authenticated user. Shared categories (including pending invitations) are included in the per-category counts, preserving v1 parity.",
  method: "get",
  path: "/v2/bookmark/fetch-bookmarks-count",
  responseExamples: {
    "happy-path": {
      description:
        "Authenticated GET returns all count fields and per-category counts. Unlike v1, error is null on success (D-14 bug fix).",
      summary: "All bookmark counts",
      value: {
        data: {
          allCount: 42,
          audioCount: 0,
          categoryCount: [
            { category_id: 724, count: 12 },
            { category_id: 831, count: 5 },
          ],
          documentsCount: 3,
          imagesCount: 15,
          instagramCount: 0,
          linksCount: 20,
          trashCount: 2,
          tweetsCount: 1,
          uncategorizedCount: 4,
          videosCount: 1,
        },
        error: null,
      } as const,
    },
    "no-categories": {
      description:
        "User with no categories or shared categories returns empty categoryCount array.",
      summary: "No categories",
      value: {
        data: {
          allCount: 5,
          audioCount: 0,
          categoryCount: [],
          documentsCount: 0,
          imagesCount: 2,
          instagramCount: 0,
          linksCount: 3,
          trashCount: 0,
          tweetsCount: 0,
          uncategorizedCount: 5,
          videosCount: 0,
        },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch bookmark counts by type and category",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
