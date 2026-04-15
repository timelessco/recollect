/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  instagramSync400Examples,
  instagramSyncRequestExamples,
  instagramSyncResponseExamples,
} from "./sync-examples";

export const instagramSyncSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
  },
  description:
    "Enqueues a batch of Instagram bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
  method: "post",
  path: "/instagram/sync",
  requestExamples: instagramSyncRequestExamples,
  response400Examples: instagramSync400Examples,
  responseExamples: instagramSyncResponseExamples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Instagram bookmarks",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
