/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RemoveCategoryFromBookmarkSupplement = {
  additionalResponses: {
    400: {
      description:
        "Missing or invalid `bookmark_id` / `category_id`, or attempt to remove the Uncategorized (ID: 0) category",
    },
    401: { description: "Not authenticated" },
    404: {
      description:
        "Bookmark not found or not owned by the user, or the category association does not exist",
    },
    503: {
      description: "Database error while verifying ownership or invoking the RPC",
    },
  },
  description:
    "Removes a single category assignment from a bookmark owned by the authenticated user. Cannot remove the Uncategorized (ID: 0) category — it is auto-managed by the exclusive-model invariant. Verifies bookmark ownership before invoking the RPC `remove_category_from_bookmark`, which acquires a FOR UPDATE lock, deletes the row, and automatically re-assigns Uncategorized when the last real category is removed. Returns 404 when the category is not associated with the bookmark. When the removed category is public, a public-category-page revalidation is scheduled after the response is sent — failures never fail the mutation.",
  method: "post",
  path: "/v2/category/remove-category-from-bookmark",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Remove a category from a bookmark",
  tags: ["Categories"],
} satisfies EndpointSupplement;
