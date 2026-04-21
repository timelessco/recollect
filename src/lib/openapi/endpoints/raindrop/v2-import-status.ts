/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RaindropImportStatusSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error fetching sync status" },
  },
  description:
    "Returns the current status of the Raindrop.io import queue for the authenticated user, including counts of pending and archived items with individual archive records (msg_id, url, failure_reason, archived_at).",
  method: "get",
  path: "/v2/raindrop/import/status",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Raindrop import status",
  tags: ["Raindrop"],
} satisfies EndpointSupplement;
