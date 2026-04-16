/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2InstagramSyncStatusSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while reading Instagram sync status" },
  },
  description:
    "Returns the current state of the authenticated user's Instagram bookmark sync queue. Surfaces the number of items still pending and the number already archived, plus the individual archive records (msg_id, url, failure_reason, archived_at) for inspection.",
  method: "get",
  path: "/v2/instagram/sync/status",
  responseExamples: {
    "status-with-data": {
      description:
        "Send a GET with a valid session — returns pending and archived counts along with archive detail rows.",
      summary: "Status with pending and archived items",
      value: {
        archived: 120,
        archives: [
          {
            archived_at: "2024-03-15T10:35:00+00:00",
            failure_reason: "invalid_url",
            msg_id: 42,
            url: "https://www.instagram.com/p/ABC123/",
          },
        ],
        pending: 5,
      },
    },
    "status-empty": {
      description:
        "Send a GET for a user with a clean queue — counts are zero and the archives list is empty.",
      summary: "Empty queue",
      value: {
        archived: 0,
        archives: [],
        pending: 0,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Instagram sync status",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
