/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddTagToBookmarkSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    403: { description: "Authenticated user does not own the bookmark or tag" },
    404: { description: "Bookmark or tag not found" },
    409: { description: "Tag is already assigned to the bookmark" },
    503: { description: "Database error while verifying ownership or inserting junction row" },
  },
  description:
    "Attaches an existing tag to a bookmark via the bookmark_tags junction table. Verifies the authenticated user owns both the bookmark and the tag before inserting. Duplicate assignments return 409.",
  method: "post",
  path: "/v2/tags/add-tag-to-bookmark",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Attach a tag to a bookmark",
  tags: ["Tags"],
} satisfies EndpointSupplement;
