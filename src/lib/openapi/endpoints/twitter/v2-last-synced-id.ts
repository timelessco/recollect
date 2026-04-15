/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TwitterLastSyncedIdSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while updating the profiles row" },
  },
  description:
    "Stores the ID of the most recently synced Twitter/X bookmark on the authenticated user's profile so a follow-up sync can resume from that point. Returns the updated value echoed from the row.",
  method: "post",
  path: "/v2/twitter/last-synced-id",
  requestExamples: {
    "happy-path": {
      description:
        "Send the shown body — persists the Twitter/X bookmark ID on the caller's profile.",
      summary: "Update last synced Twitter ID",
      value: { last_synced_twitter_id: "1800000000000000001" },
    },
  },
  response400Examples: {
    "empty-string": {
      description:
        'Send `{ last_synced_twitter_id: "" }` — returns 400 because the field requires at least one character.',
      summary: "Empty last_synced_twitter_id",
      value: { error: "Too small: expected string to have >=1 characters" },
    },
    "missing-field": {
      description: "Send `{}` — returns 400 because `last_synced_twitter_id` is required.",
      summary: "Missing last_synced_twitter_id",
      value: { error: "Invalid input: expected string, received undefined" },
    },
  },
  responseExamples: {
    "id-stored": {
      description: "Updated profile row showing the new last-synced Twitter/X ID.",
      summary: "Last synced Twitter ID stored",
      value: { last_synced_twitter_id: "1800000000000000001" },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update last synced Twitter ID",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
