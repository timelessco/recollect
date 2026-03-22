/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const clearTrashSupplement = {
  description:
    "Cron-triggered cleanup that permanently deletes bookmarks trashed more than 30 days ago. Processes in batches of 1000, grouped by user. Requires `CRON_SECRET` as bearer token (not a user JWT).",
  method: "get",
  path: "/cron/clear-trash",
  responseExample: {
    data: { deletedCount: 42 },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }],
  summary: "Permanently delete expired trashed bookmarks",
  tags: ["Cron"],
} satisfies EndpointSupplement;
