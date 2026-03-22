/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const createAndAssignTagSupplement = {
  additionalResponses: {
    403: { description: "Bookmark not found or not owned by user" },
    409: { description: "Tag with this name already exists for this user" },
  },
  description:
    "Atomically creates a new tag and assigns it to the specified bookmark in a single transaction. The caller must own both the bookmark and the tag name must be unique for this user. Returns 403 if the bookmark is not found or not owned by the user. Returns 409 if the user already has a tag with the same name.",
  method: "post",
  path: "/tags/create-and-assign-tag",
  requestExample: {
    bookmarkId: 42,
    name: "typescript",
  },
  responseExample: {
    data: {
      bookmarkTag: {
        bookmark_id: 42,
        created_at: "2024-03-15T10:30:00Z",
        id: 201,
        tag_id: 15,
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      },
      tag: {
        created_at: "2024-03-15T10:30:00Z",
        id: 15,
        name: "typescript",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Create a new tag and assign it to a bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
