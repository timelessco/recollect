/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  v2TwitterSync400Examples,
  v2TwitterSyncRequestExamples,
  v2TwitterSyncResponseExamples,
} from "./v2-sync-examples";

export const v2TwitterSyncSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
    401: { description: "Not authenticated" },
    503: { description: "Database error while enqueuing Twitter/X bookmarks" },
  },
  description:
    "Enqueues a batch of Twitter/X bookmarks for async archiving. Calls the `enqueue_twitter_bookmarks` RPC for transactional dedup against existing bookmarks for this user. Returns counts of inserted rows and skipped URLs (already stored).",
  method: "post",
  path: "/v2/twitter/sync",
  requestExamples: v2TwitterSyncRequestExamples,
  response400Examples: v2TwitterSync400Examples,
  responseExamples: v2TwitterSyncResponseExamples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Twitter/X bookmarks",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
