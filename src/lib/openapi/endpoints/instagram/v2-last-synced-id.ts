/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2InstagramLastSyncedIdSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while updating the profiles row" },
  },
  description:
    "Stores the ID of the most recently synced Instagram bookmark on the authenticated user's profile so a follow-up sync can resume from that point. Returns the updated value echoed from the row.",
  method: "post",
  path: "/v2/instagram/last-synced-id",
  requestExamples: {
    "happy-path": {
      description:
        "Send the shown body — persists the Instagram bookmark ID on the caller's profile.",
      summary: "Update last synced Instagram ID",
      value: { last_synced_instagram_id: "17890455278329641" },
    },
  },
  response400Examples: {
    "missing-field": {
      description: "Send `{}` — returns 400 because `last_synced_instagram_id` is required.",
      summary: "Missing last_synced_instagram_id",
      value: { error: "Required" },
    },
  },
  responseExamples: {
    "id-stored": {
      description: "Updated profile row showing the new last-synced Instagram ID.",
      summary: "Last synced Instagram ID stored",
      value: { last_synced_instagram_id: "17890455278329641" },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update last synced Instagram ID",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
