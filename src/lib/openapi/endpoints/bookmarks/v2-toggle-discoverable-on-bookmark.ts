/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2ToggleDiscoverableOnBookmarkSupplement = {
  additionalResponses: {
    400: {
      description: "Bookmark not found, permission denied, or bookmark is trashed",
    },
    401: { description: "Not authenticated" },
    503: { description: "Database error while toggling discoverable status" },
  },
  description:
    "Makes a bookmark publicly discoverable or removes its discoverability. When making discoverable, the bookmark must not be in trash. Removing discoverability is always allowed regardless of trash status. Returns 400 if the bookmark is not found, not owned by the user, or is trashed (when enabling).",
  method: "post",
  path: "/v2/bookmark/toggle-discoverable-on-bookmark",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Toggle discoverable status on a bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
