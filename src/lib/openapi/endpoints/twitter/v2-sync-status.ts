/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TwitterSyncStatusSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while reading the Twitter sync queue" },
  },
  description:
    "Returns the current state of the authenticated user's Twitter/X bookmark sync queue — pending and archived counts plus per-message archive records (msg_id, url, archived_at, failure_reason).",
  method: "get",
  path: "/v2/twitter/sync/status",
  responseExamples: {
    "status-with-data": {
      description:
        "Call the endpoint — returns current queue depth and archive records for the authenticated user.",
      summary: "Status with pending and archived counts",
      value: {
        archived: 250,
        archives: [
          {
            archived_at: "2024-03-15T10:45:00+00:00",
            failure_reason: null,
            msg_id: 88,
            url: "https://x.com/example/status/1986170355535286529",
          },
        ],
        pending: 3,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Twitter sync status",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
