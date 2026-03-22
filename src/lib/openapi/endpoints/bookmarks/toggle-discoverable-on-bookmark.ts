/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const toggleDiscoverableOnBookmarkSupplement = {
  additionalResponses: {
    400: {
      description: "Bookmark not found, permission denied, or bookmark is trashed",
    },
  },
  description:
    "Makes a bookmark publicly discoverable or removes its discoverability. When making discoverable, the bookmark must not be in trash. Removing discoverability is always allowed regardless of trash status. Returns 400 if the bookmark is not found, not owned by the user, or is trashed (when enabling).",
  method: "post",
  path: "/bookmark/toggle-discoverable-on-bookmark",
  requestExample: {
    bookmark_id: 42,
    make_discoverable: true,
  },
  responseExample: {
    data: {
      id: 42,
      make_discoverable: "2024-03-15T10:30:00Z",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Toggle discoverable status on a bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
