/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2RaindropImportRetrySupplement = {
  additionalResponses: {
    400: { description: "Invalid retry request" },
    401: { description: "Not authenticated" },
    503: { description: "Database error" },
  },
  description:
    "Requeues failed Raindrop import messages for retry. Accepts either a list of specific message IDs (1-100 entries) or `{ all: true }` to retry every archived message for the authenticated user. Only messages owned by the caller are retried.",
  method: "post",
  path: "/v2/raindrop/import/retry",
  requestExamples: {
    "empty-msg-ids-array": {
      description:
        "Send `{ msg_ids: [] }` — fails validation because msg_ids must contain at least one ID.",
      summary: "Validation: empty array (400)",
      value: { msg_ids: [] },
    },
    "empty-object": {
      description:
        "Send `{}` — fails validation because the body must include either `msg_ids` or `all: true`.",
      summary: "Validation: neither field provided (400)",
      value: {},
    },
    "retry-all-archived": {
      description:
        "Send `{ all: true }` — requeues every archived message for the authenticated user. Returns the total requeued count.",
      summary: "Retry all archived",
      value: { all: true },
    },
    "retry-single-message": {
      description:
        "Send `{ msg_ids: [1] }` — requeues a single archived message by its msg_id. Useful when retrying one specific failure surfaced by the status endpoint.",
      summary: "Retry single message",
      value: { msg_ids: [1] },
    },
    "retry-specific-messages": {
      description:
        "Send `{ msg_ids: [1, 2, 3] }` — requeues multiple archived messages. Returned `requeued` may be less than `requested` when IDs are missing or belong to another user.",
      summary: "Retry specific messages",
      value: { msg_ids: [1, 2, 3] },
    },
  },
  response400Examples: {
    "empty-msg-ids-array": {
      description: "Send `{ msg_ids: [] }` — msg_ids must contain at least one message ID.",
      summary: "Empty array rejected",
      value: { error: "Too small: expected array to have >=1 items" },
    },
    "empty-object": {
      description: "Send `{}` — body must include either a `msg_ids` array or `all: true`.",
      summary: "Neither field provided",
      value: { error: "Invalid input" },
    },
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All 10 archived messages for the user were requeued in one operation.",
      summary: "All archived requeued",
      value: { requeued: 10 },
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
  summary: "Retry failed Raindrop import items (v2)",
  tags: ["Raindrop"],
} satisfies EndpointSupplement;
