/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const clearBookmarkTrashSupplement = {
  description:
    "Permanently deletes all bookmarks in the authenticated user's trash. Processes up to 1000 bookmarks per batch. Returns the total deleted count. Idempotent — calling with an empty trash returns deletedCount: 0.",
  method: "post",
  path: "/bookmark/clear-bookmark-trash",
  requestExample: {},
  responseExample: {
    data: {
      deletedCount: 12,
      message: "Deleted 12 bookmarks",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Clear all trashed bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
