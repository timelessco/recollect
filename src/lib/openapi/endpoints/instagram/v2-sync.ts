/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  v2InstagramSync400Examples,
  v2InstagramSyncRequestExamples,
  v2InstagramSyncResponseExamples,
} from "./v2-sync-examples";

export const v2InstagramSyncSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
    401: { description: "Not authenticated" },
    503: { description: "Database error while enqueuing Instagram bookmarks" },
  },
  description:
    "Enqueues a batch of Instagram bookmarks for async archiving. The handler deduplicates exact URL duplicates within the batch in memory, then calls the `enqueue_instagram_bookmarks` RPC for transactional dedup against existing bookmarks for this user. Returns counts of inserted rows and skipped URLs (in-batch + already-stored).",
  method: "post",
  path: "/v2/instagram/sync",
  requestExamples: v2InstagramSyncRequestExamples,
  response400Examples: v2InstagramSync400Examples,
  responseExamples: v2InstagramSyncResponseExamples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Instagram bookmarks",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
