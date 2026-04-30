/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2SetBookmarkCategoriesSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request: invalid bookmark_id, max 100 category IDs, or duplicate IDs",
    },
    401: { description: "Not authenticated" },
    403: { description: "Bookmark not owned or no edit access to one or more categories" },
    404: { description: "Bookmark not found or not owned by user" },
    503: { description: "Database error" },
  },
  description:
    "Atomically replaces all category assignments for a bookmark. All existing assignments are removed and replaced with the provided list. The caller must own the bookmark and either own or have edit access (via shared collaboration) to every specified category. Maximum 100 category IDs. Duplicate IDs are rejected. Revalidation is scheduled for every affected public category (old and new) and runs after the response is sent; revalidation failures do not fail the mutation.",
  method: "post",
  path: "/v2/category/set-bookmark-categories",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Replace all categories on a bookmark",
  tags: ["Categories"],
} satisfies EndpointSupplement;
