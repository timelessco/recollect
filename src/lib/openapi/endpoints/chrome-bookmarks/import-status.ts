/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const chromeBookmarkImportStatusSupplement = {
  description:
    "Returns the current status of the Chrome bookmark import queue, including counts of pending and archived items with individual archive records.",
  method: "get",
  path: "/chrome-bookmarks/import/status",
  responseExamples: {
    "status-with-data": {
      description:
        "Typical response showing items still in queue (pending) and previously archived failures. The archives array contains individual failure records with msg_id, url, failure_reason, and archived_at.",
      summary: "Status with pending and archived items",
      value: {
        data: {
          archived: 2,
          archives: [
            {
              archived_at: "2026-03-20T11:00:00Z",
              failure_reason: "max_retries_exceeded: Failed to fetch URL",
              msg_id: 42,
              url: "https://example.com/dead-link",
            },
          ],
          pending: 8,
        },
        error: null,
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Get Chrome bookmark import status",
  tags: ["Chrome Bookmarks"],
} satisfies EndpointSupplement;
