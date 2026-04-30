/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TwitterSyncRetrySupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while requeuing archived messages" },
  },
  description:
    "Requeues failed Twitter/X import messages for another processing attempt. Accepts either a list of specific pgmq message IDs (per-message path) or `{ all: true }` to retry every archived failure belonging to the authenticated user.",
  method: "post",
  path: "/v2/twitter/sync/retry",
  requestExamples: {
    "retry-all-archived": {
      description:
        "Send `{ all: true }` — requeues every archived Twitter/X import message for the caller.",
      summary: "Retry all archived failures",
      value: { all: true },
    },
    "retry-specific-messages": {
      description: "Send `{ msg_ids: [1, 2, 3] }` — requeues those archived messages by ID.",
      summary: "Retry specific messages by msg_id",
      value: { msg_ids: [1, 2, 3] },
    },
  },
  response400Examples: {
    "empty-msg-ids-array": {
      description: "Send `{ msg_ids: [] }` — rejected because the array must contain ≥1 item.",
      summary: "Empty msg_ids rejected",
      value: { error: "Too small: expected array to have >=1 items" },
    },
    "empty-object": {
      description:
        "Send `{}` — rejected because body must include either `msg_ids` or `all: true`.",
      summary: "Empty object rejected",
      value: { error: "Invalid input" },
    },
    "invalid-msg-ids-type": {
      description: 'Send `{ msg_ids: ["abc"] }` — rejected because `msg_ids` must be integers.',
      summary: "Invalid msg_ids type rejected",
      value: { error: "Invalid input" },
    },
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All 5 archived messages for the caller were requeued in one operation.",
      summary: "All archived messages requeued",
      value: { requeued: 5 },
    },
    "retry-specific-messages": {
      description: "All 3 requested message IDs were found and requeued.",
      summary: "Specific messages requeued",
      value: { requested: 3, requeued: 3 },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retry failed Twitter sync imports",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
