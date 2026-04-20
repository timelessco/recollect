/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TwitterSyncFolderBookmarksSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or mapping data" },
    401: { description: "Not authenticated" },
    503: { description: "Queue enqueue failed" },
  },
  description:
    "Queues bookmark-to-collection mapping messages. Used after sync-folders to associate imported Twitter/X bookmarks with their respective collections. Returns the count of successfully queued mappings.",
  method: "post",
  path: "/v2/twitter/sync-folder-bookmarks",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Link Twitter bookmarks to their folders",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
