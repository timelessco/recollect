import { bearerAuth } from "@/lib/openapi/registry";
/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const instagramLastSyncedIdSupplement = {
  path: "/instagram/last-synced-id",
  method: "post",
  tags: ["Instagram"],
  summary: "Update last synced Instagram ID",
  description:
    "Stores the ID of the last synced Instagram bookmark so subsequent syncs can resume from that point. Returns the updated ID.",
  security: [{ [bearerAuth.name]: [] }, {}],
  requestExample: {
    last_synced_instagram_id: "17890455278329641",
  },
  responseExample: {
    data: {
      last_synced_instagram_id: "17890455278329641",
    },
    error: null,
  },
} satisfies EndpointSupplement;
