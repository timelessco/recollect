/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncRetrySupplement = {
  additionalResponses: {
    400: { description: "Invalid retry request" },
  },
  description:
    "Requeues failed Twitter/X import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
  method: "post",
  path: "/twitter/sync/retry",
  requestExamples: {
    "empty-msg-ids-array": {
      description: "Returns 400 — msg_ids must have at least 1 item.",
      summary: "Validation: empty msg_ids array",
      value: { msg_ids: [] },
    },
    "empty-object": {
      description: "Returns 400 — must provide either msg_ids or all: true.",
      summary: "Validation: empty object body",
      value: {},
    },
    "invalid-msg-ids-type": {
      description: "Returns 400 — msg_ids must be an array of numbers.",
      summary: "Validation: invalid msg_ids type",
      value: { msg_ids: ["abc", "def"] },
    },
    "retry-all-archived": {
      description: "Re-queues all archived (failed) messages for the authenticated user.",
      summary: "Retry all archived failures",
      value: { all: true },
    },
    "retry-single-message": {
      description: "Re-queue a single archived message by its ID.",
      summary: "Retry a single message",
      value: { msg_ids: [1] },
    },
    "retry-specific-messages": {
      description: "Re-queues archived messages by their IDs for another processing attempt.",
      summary: "Retry specific messages by msg_id",
      value: { msg_ids: [1, 2, 3] },
    },
  },
  response400Examples: {
    "empty-msg-ids-array": {
      description: "The msg_ids array must contain at least one message ID.",
      summary: "Empty array rejected",
      value: {
        data: null,
        error: "Too small: expected array to have >=1 items",
      },
    },
    "empty-object": {
      description: "Request must include either msg_ids array or all:true flag.",
      summary: "Empty object rejected",
      value: {
        data: null,
        error: "Invalid input",
      },
    },
    "invalid-msg-ids-type": {
      description: "The msg_ids field must be an array of integers, not strings.",
      summary: "Invalid type rejected",
      value: {
        data: null,
        error: "Invalid input",
      },
    },
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All 5 archived messages for the user requeued in one operation.",
      summary: "All archived messages requeued",
      value: { data: { requeued: 5 }, error: null },
    },
    "retry-single-message": {
      description: "The requested message was found and requeued for another processing attempt.",
      summary: "Single message requeued",
      value: { data: { requested: 1, requeued: 1 }, error: null },
    },
    "retry-specific-messages": {
      description: "All 3 requested messages found and requeued for processing.",
      summary: "Specific messages requeued",
      value: { data: { requested: 3, requeued: 3 }, error: null },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retry failed Twitter sync imports",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
