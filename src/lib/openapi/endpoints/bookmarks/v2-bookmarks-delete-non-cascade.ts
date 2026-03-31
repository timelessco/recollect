import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2BookmarksDeleteNonCascadeSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or missing bookmark ID" },
  },
  description:
    "Deletes a single bookmark row by ID without removing associated foreign key data or storage objects. Filters by user_id to prevent cross-user deletion. Primarily used by Cypress e2e tests for cleanup.",
  method: "delete",
  path: "/v2/bookmarks/delete/non-cascade",
  requestExamples: {
    "delete-by-id": {
      description: "Removes the bookmark row with id=42 owned by the authenticated user.",
      summary: "Delete bookmark by ID",
      value: {
        data: { id: 42 },
      } as const,
    },
  },
  response400Examples: {
    "missing-id": {
      description: "Fails when the data.id field is missing.",
      summary: "Missing bookmark ID",
      value: {
        error: "data.id: Required",
      } as const,
    },
  },
  responseExamples: {
    success: {
      description: "Returns null on successful deletion.",
      summary: "Bookmark deleted successfully",
      value: null,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Delete a bookmark without cascade (test cleanup)",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
