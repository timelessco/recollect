/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteBookmarkSupplement = {
  additionalResponses: {
    400: { description: "Invalid input" },
    401: { description: "Not authenticated" },
    503: { description: "Database error while deleting bookmarks" },
  },
  description:
    "Permanently deletes one or more bookmarks by ID. The caller must own the bookmarks. Processes in batches of 1000 and cleans up associated storage files (screenshots, OG images, uploaded files) and bookmark tags. Bookmarks in trash can be deleted directly — this skips the trash and is irreversible.",
  method: "post",
  path: "/v2/bookmark/delete-bookmark",
  requestExamples: {
    "delete-multiple": {
      description: "Send the shown body — permanently deletes 5 bookmarks owned by the caller",
      summary: "Delete multiple bookmarks",
      value: {
        deleteData: [
          { id: 46_984 },
          { id: 46_985 },
          { id: 46_986 },
          { id: 46_987 },
          { id: 46_988 },
        ],
      },
    },
    "delete-already-deleted": {
      description:
        "Send the shown body with IDs that are already removed — idempotent, returns deletedCount 0",
      summary: "Delete already-deleted bookmarks (idempotent)",
      value: {
        deleteData: [{ id: 46_984 }, { id: 46_985 }],
      },
    },
  },
  response400Examples: {
    "missing-delete-data": {
      description: "Send `{}` — returns 400: deleteData field is required",
      summary: "Missing deleteData field",
      value: {
        error: "Invalid input: expected array, received undefined",
      },
    },
    "empty-delete-data": {
      description: "Send `{ deleteData: [] }` — returns 400: at least one bookmark required",
      summary: "Empty deleteData array",
      value: {
        error: "At least one bookmark is required",
      },
    },
  },
  responseExamples: {
    "delete-multiple": {
      description: "Five owned bookmarks were permanently deleted",
      summary: "Delete multiple bookmarks",
      value: {
        deletedCount: 5,
        message: "Deleted 5 bookmark(s)",
      },
    },
    "delete-already-deleted": {
      description:
        "Supplied IDs were already deleted — endpoint is idempotent and returns deletedCount 0",
      summary: "Idempotent delete (already gone)",
      value: {
        deletedCount: 0,
        message: "Deleted 0 bookmark(s)",
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Permanently delete bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
