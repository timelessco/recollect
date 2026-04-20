/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { serviceRoleAuth } from "@/lib/openapi/registry";

export const v2ClearTrashSupplement = {
  additionalResponses: {
    401: { description: "Missing or invalid service role bearer token" },
    503: { description: "Database error while fetching or deleting trashed bookmarks" },
  },
  description:
    "Cron-triggered cleanup that permanently deletes bookmarks trashed more than 30 days ago. Processes in batches of 1000, grouped by user, with cascading storage + tag cleanup per batch. Requires Supabase service role key as bearer token (not a user JWT). Returns bare `{ deletedCount }`.",
  method: "post",
  path: "/v2/cron/clear-trash",
  security: [{ [serviceRoleAuth.name]: [] }],
  summary: "Permanently delete expired trashed bookmarks",
  tags: ["Cron"],
} satisfies EndpointSupplement;
