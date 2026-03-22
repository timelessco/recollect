/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const twitterLastSyncedIdSupplement = {
  description:
    "Stores the ID of the last synced Twitter/X bookmark so subsequent syncs can resume from that point. Returns the updated ID.",
  method: "post",
  path: "/twitter/last-synced-id",
  requestExample: {
    last_synced_twitter_id: "1834567890123456789",
  },
  responseExample: {
    data: {
      last_synced_twitter_id: "1834567890123456789",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update last synced Twitter ID",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
