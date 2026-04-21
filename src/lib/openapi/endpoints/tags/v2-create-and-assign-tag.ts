/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2CreateAndAssignTagSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    403: { description: "Bookmark not found or not owned by the authenticated user" },
    409: { description: "A tag with this name already exists for this user" },
    503: { description: "Database error while creating or assigning the tag" },
  },
  description:
    "Atomically creates a new tag and assigns it to the specified bookmark in a single PostgreSQL transaction. Verifies bookmark ownership with FOR UPDATE, inserts the tag, and inserts the bookmark_tags junction row. Returns 403 if the bookmark is missing or not owned by the caller; 409 if the caller already has a tag with the same (trimmed) name.",
  method: "post",
  path: "/v2/tags/create-and-assign-tag",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Create a tag and assign it to a bookmark",
  tags: ["Tags"],
} satisfies EndpointSupplement;
