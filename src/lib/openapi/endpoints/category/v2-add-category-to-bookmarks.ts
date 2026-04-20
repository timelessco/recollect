/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddCategoryToBookmarksSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    403: { description: "Bookmarks not owned or no edit access to category" },
    404: { description: "Category not found" },
    503: { description: "Database error" },
  },
  description:
    "Assigns a category to multiple bookmarks in a single atomic operation. All bookmarks must be owned by the caller. The caller must have access to the category (owner or collaborator with edit access). Accepts 1–100 bookmark IDs. Use `category_id: 0` to assign to the Uncategorized collection. Returns only the newly-created assignments (existing ones are skipped).",
  method: "post",
  path: "/v2/category/add-category-to-bookmarks",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Assign a category to multiple bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
