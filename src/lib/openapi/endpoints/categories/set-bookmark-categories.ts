/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const setBookmarkCategoriesSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request: invalid bookmark_id, max 100 category IDs, or duplicate IDs",
    },
    403: {
      description: "Bookmark not owned or no access to specified categories",
    },
    404: { description: "Bookmark not found" },
  },
  description:
    "Atomically replaces all category assignments for a bookmark. All existing assignments are removed and replaced with the provided list. The caller must own the bookmark and have access to all specified categories. Maximum 100 category IDs. No duplicate IDs allowed. Triggers revalidation for all affected public categories (old and new).",
  method: "post",
  path: "/category/set-bookmark-categories",
  requestExample: {
    bookmark_id: 42,
    category_ids: [7, 8, 9],
  },
  responseExample: {
    data: [
      { bookmark_id: 42, category_id: 7 },
      { bookmark_id: 42, category_id: 8 },
      { bookmark_id: 42, category_id: 9 },
    ],
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Replace all categories on a bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
