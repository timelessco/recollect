/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncStatusSupplement = {
  description:
    "Returns the current status of the Twitter/X bookmark sync queue, including counts of pending and archived items with individual archive records.",
  method: "get",
  path: "/twitter/sync/status",
  responseExamples: {
    "status-with-data": {
      description: "Returns current queue depth and archive records for the authenticated user.",
      summary: "Status with pending and archived counts",
      value: {
        data: {
          archived: 250,
          archives: [
            {
              archived_at: "2024-03-15T10:45:00Z",
              failure_reason: null,
              msg_id: 88,
              url: "https://x.com/SawyerMerritt/status/1986170355535286529",
            },
          ],
          pending: 3,
        },
        error: null,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Twitter sync status",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
