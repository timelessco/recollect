/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  twitterSyncRequestExamples,
  twitterSyncResponse200Examples,
  twitterSyncResponse400Examples,
} from "./sync-examples";

export const twitterSyncSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
  },
  description:
    "Enqueues a batch of Twitter/X bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
  method: "post",
  path: "/twitter/sync",
  requestExamples: twitterSyncRequestExamples,
  response400Examples: twitterSyncResponse400Examples,
  responseExamples: twitterSyncResponse200Examples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Twitter/X bookmarks",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
