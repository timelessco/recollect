/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { serviceRoleAuth } from "@/lib/openapi/registry";

export const clearTrashSupplement = {
  description:
    "Cron-triggered cleanup that permanently deletes bookmarks trashed more than 30 days ago. Processes in batches of 1000, grouped by user. Requires Supabase service role key as bearer token (not a user JWT).",
  method: "post",
  path: "/cron/clear-trash",
  requestExample: {},
  responseExample: {
    data: { deletedCount: 42 },
    error: null,
  },
  security: [{ [serviceRoleAuth.name]: [] }],
  summary: "Permanently delete expired trashed bookmarks",
  tags: ["Cron"],
} satisfies EndpointSupplement;
