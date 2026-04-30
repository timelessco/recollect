import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddCategoryToBookmarkSupplement = {
  additionalResponses: {
    400: {
      description:
        "Missing or invalid `bookmark_id` / `category_id`, or schema violation on the provided fields",
    },
    401: { description: "Not authenticated" },
    403: {
      description:
        "Authenticated user does not own the target category and has no collaborator edit access",
    },
    404: { description: "Bookmark or category not found or not owned by the user" },
    503: { description: "Database error while verifying ownership or invoking the RPC" },
  },
  description:
    "Assigns a single category to a bookmark owned by the authenticated user. Verifies bookmark ownership and category access (owner or collaborator with edit access) in parallel before invoking the bulk RPC `add_category_to_bookmarks` with a single-element array. The RPC enforces the exclusive-model invariant: adding a real category (positive `category_id`) removes the uncategorized placeholder (`category_id = 0`) from that bookmark. When the target category is public, a public-category-page revalidation is scheduled after the response is sent — failures never fail the mutation.",
  method: "post",
  path: "/v2/category/add-category-to-bookmark",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Add a category to a bookmark",
  tags: ["Categories"],
} satisfies EndpointSupplement;
