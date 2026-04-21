/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RaindropImportSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
    401: { description: "Not authenticated" },
    503: { description: "Database error" },
  },
  description:
    "Enqueues a batch of Raindrop.io bookmarks for async import. Deduplicates within the batch and against existing bookmarks. Returns counts of queued and skipped items.",
  method: "post",
  path: "/v2/raindrop/import",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Import Raindrop.io bookmarks (v2)",
  tags: ["Raindrop"],
} satisfies EndpointSupplement;
