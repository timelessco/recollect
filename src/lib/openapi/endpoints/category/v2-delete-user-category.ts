/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteUserCategorySupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    403: { description: "Only the category owner can delete it" },
    404: { description: "Category not found or already deleted" },
    503: { description: "Database error while cascading the delete" },
  },
  description:
    "Deletes a category owned by the authenticated user. Cascade: shared-access records are removed, all junction entries for this category are deleted, and the category row itself is deleted. " +
    "When `keep_bookmarks=false` (default), the owner's bookmarks in this category are moved to trash; when `keep_bookmarks=true`, owner bookmarks that would otherwise be orphaned are auto-assigned to Uncategorized (`category_id=0`). " +
    "Collaborators lose the category reference but their bookmarks are never trashed. If the category was public, the public collection page is revalidated in the background. Collaborators with accepted invites are emailed after the response is returned.",
  method: "post",
  path: "/v2/category/delete-user-category",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Delete a category",
  tags: ["Categories"],
} satisfies EndpointSupplement;
