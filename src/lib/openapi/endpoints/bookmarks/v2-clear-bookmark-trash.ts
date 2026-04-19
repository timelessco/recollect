/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2ClearBookmarkTrashSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: {
      description: "Database error while counting, fetching, or deleting trashed bookmarks",
    },
  },
  description:
    "Permanently deletes every bookmark currently in the authenticated user's trash. Processes up to 1000 bookmarks per batch until the trash is empty. Idempotent — calling with an empty trash returns `deletedCount: 0`. Cascades cleanup to bookmark tags and R2 storage objects (screenshots, og images, uploaded files, videos).",
  method: "post",
  path: "/v2/bookmark/clear-bookmark-trash",
  requestExamples: {
    "clear-all-trash": {
      description:
        "Send `{}` — permanently deletes every bookmark in the authenticated user's trash",
      summary: "Clear all trashed bookmarks",
      value: {},
    },
  },
  responseExamples: {
    "trash-cleared": {
      description: "Send the shown body — permanently deleted 6 trashed bookmarks",
      summary: "Trash cleared",
      value: { deletedCount: 6, message: "Deleted 6 bookmarks" },
    },
    "empty-trash": {
      description: "Send the shown body when trash is already empty — returns zero-count message",
      summary: "Empty trash (idempotent)",
      value: { deletedCount: 0, message: "No bookmarks in trash to delete" },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Clear all trashed bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
