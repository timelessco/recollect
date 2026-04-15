/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const instagramLastSyncedIdSupplement = {
  description:
    "Stores the ID of the last synced Instagram bookmark so subsequent syncs can resume from that point. Returns the updated ID.",
  method: "post",
  path: "/instagram/last-synced-id",
  requestExample: {
    last_synced_instagram_id: "17890455278329641",
  },
  responseExample: {
    data: {
      last_synced_instagram_id: "17890455278329641",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update last synced Instagram ID",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
