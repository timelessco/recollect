/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const instagramSyncStatusSupplement = {
  description:
    "Returns the current status of the Instagram bookmark sync queue, including counts of pending and archived items with individual archive records.",
  method: "get",
  path: "/instagram/sync/status",
  responseExamples: {
    "status-with-data": {
      description:
        "Typical response showing items still in queue (pending) and previously archived failures. The archives array contains individual failure records with msg_id, url, failure_reason, and archived_at.",
      summary: "Status with pending and archived items",
      value: {
        data: {
          archived: 120,
          archives: [
            {
              archived_at: "2024-03-15T10:35:00Z",
              failure_reason: "invalid_url",
              msg_id: 42,
              url: "https://www.instagram.com/p/ABC123/",
            },
          ],
          pending: 5,
        },
        error: null,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Instagram sync status",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
