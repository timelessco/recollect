/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  twitterSyncFolderBookmarksRequestExamples,
  twitterSyncFolderBookmarksResponse200Examples,
  twitterSyncFolderBookmarksResponse400Examples,
} from "./sync-folder-bookmarks-examples";

export const twitterSyncFolderBookmarksSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or mapping data" },
  },
  description:
    "Queues bookmark-to-collection mapping messages. Used after sync-folders to associate imported Twitter bookmarks with their respective collections. Returns the count of successfully queued mappings.",
  method: "post",
  path: "/twitter/sync-folder-bookmarks",
  requestExamples: twitterSyncFolderBookmarksRequestExamples,
  response400Examples: twitterSyncFolderBookmarksResponse400Examples,
  responseExamples: twitterSyncFolderBookmarksResponse200Examples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Link Twitter bookmarks to their folders",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
