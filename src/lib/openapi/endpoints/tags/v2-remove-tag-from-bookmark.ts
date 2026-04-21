/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RemoveTagFromBookmarkSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    403: { description: "Authenticated user does not own the bookmark or tag" },
    404: { description: "Bookmark, tag, or bookmark-tag assignment not found" },
    503: { description: "Database error while verifying ownership or deleting junction row" },
  },
  description:
    "Detaches a tag from a bookmark by deleting the matching row in the bookmark_tags junction table. Verifies the authenticated user owns both the bookmark and the tag before deleting. Returns 404 when no assignment exists for the given pair.",
  method: "post",
  path: "/v2/tags/remove-tag-from-bookmark",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Detach a tag from a bookmark",
  tags: ["Tags"],
} satisfies EndpointSupplement;
