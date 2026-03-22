/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const addCategoryToBookmarkSupplement = {
  additionalResponses: {
    403: { description: "No edit access to this category" },
    404: { description: "Bookmark or category not found" },
  },
  description:
    "Assigns a category to a single bookmark. The caller must own the bookmark and have access to the category (owner or collaborator with edit access). Use category_id: 0 to assign to the Uncategorized collection. Returns 404 if the bookmark or category is not found. Returns 403 if access is denied.",
  method: "post",
  path: "/category/add-category-to-bookmark",
  requestExample: {
    bookmark_id: 42,
    category_id: 7,
  },
  responseExample: {
    data: [{ bookmark_id: 42, category_id: 7 }],
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Add a category to a bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
