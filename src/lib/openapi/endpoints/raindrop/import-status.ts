/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const raindropImportStatusSupplement = {
  description:
    "Returns the current status of the Raindrop.io import queue, including counts of pending and archived items with individual archive records.",
  method: "get",
  path: "/raindrop/import/status",
  responseExamples: {
    "status-with-data": {
      description:
        "Typical response showing items still in queue (pending) and previously archived failures. The archives array contains individual failure records with msg_id, url, failure_reason, and archived_at.",
      summary: "Status with pending and archived items",
      value: {
        data: {
          archived: 500,
          archives: [
            {
              archived_at: "2024-03-15T11:00:00Z",
              failure_reason: "Failed to fetch URL",
              msg_id: 17,
              url: "https://example.com/article",
            },
          ],
          pending: 10,
        },
        error: null,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Raindrop import status",
  tags: ["Raindrop"],
} satisfies EndpointSupplement;
