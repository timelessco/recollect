/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2InstagramSyncRetrySupplement = {
  additionalResponses: {
    400: { description: "Invalid retry request" },
    401: { description: "Not authenticated" },
    503: { description: "Database error while requeuing archived messages" },
  },
  description:
    "Requeues failed Instagram import messages for retry. Accepts either a bounded list of specific message IDs (`msg_ids`, 1–100 entries) or `{ all: true }` to retry every archived import for the authenticated user. Returns the requeued count, plus the requested count when specific IDs were supplied.",
  method: "post",
  path: "/v2/instagram/sync/retry",
  requestExamples: {
    "retry-all-archived": {
      description:
        "Send `{ all: true }` — requeues every archived Instagram import for the caller in a single operation.",
      summary: "Retry all archived",
      value: { all: true },
    },
    "retry-single-message": {
      description:
        "Send a single-entry `msg_ids` array — requeues one specific archived message (e.g. after investigating a failure from the status endpoint).",
      summary: "Retry single message",
      value: { msg_ids: [521] },
    },
    "retry-specific-messages": {
      description:
        "Send multiple `msg_ids` — requeues those archived messages. The response's `requeued` count may be less than `requested` if any IDs don't exist or belong to another user.",
      summary: "Retry specific messages",
      value: { msg_ids: [1, 2, 3] },
    },
  },
  response400Examples: {
    "empty-msg-ids-array": {
      description:
        "Send `{ msg_ids: [] }` — returns 400 because the array must contain at least one ID.",
      summary: "Empty msg_ids array",
      value: { error: "Too small: expected array to have >=1 items" },
    },
    "empty-object": {
      description: "Send `{}` — returns 400 because neither `msg_ids` nor `all` was provided.",
      summary: "Neither field provided",
      value: { error: "Invalid input" },
    },
    "invalid-msg-ids-type": {
      description: 'Send `{ msg_ids: ["abc"] }` — returns 400 because entries must be integers.',
      summary: "Wrong type for msg_ids",
      value: { error: "Invalid input" },
    },
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All 12 archived messages for the caller were requeued in one operation.",
      summary: "All archived requeued",
      value: { requeued: 12 },
    },
    "retry-single-message": {
      description: "The requested message was found and requeued for another processing attempt.",
      summary: "Single message requeued",
      value: { requested: 1, requeued: 1 },
    },
    "retry-specific-messages": {
      description: "All 3 requested messages were found and requeued.",
      summary: "Specific messages requeued",
      value: { requested: 3, requeued: 3 },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retry failed Instagram sync imports",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
