/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const instagramSyncRetrySupplement = {
  additionalResponses: {
    400: { description: "Invalid retry request" },
  },
  description:
    "Requeues failed Instagram import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
  method: "post",
  path: "/instagram/sync/retry",
  requestExamples: {
    "empty-msg-ids-array": {
      description: "msg_ids array must have at least one element. An empty array fails validation.",
      summary: "Validation: empty array (400)",
      value: { msg_ids: [] },
    },
    "empty-object": {
      description:
        "Request body must include either msg_ids or all:true. An empty object has neither.",
      summary: "Validation: neither field provided (400)",
      value: {},
    },
    "invalid-msg-ids-type": {
      description:
        "msg_ids must be an array of integers. Passing string values fails type validation.",
      summary: "Validation: strings instead of numbers (400)",
      value: { msg_ids: ["abc", "def"] },
    },
    "retry-all-archived": {
      description:
        "Requeue ALL archived messages for the authenticated user in one call. Returns total requeued count.",
      summary: "Retry all archived",
      value: { all: true },
    },
    "retry-single-message": {
      description:
        "Requeue a single archived message by its msg_id. Useful when retrying one specific failure from the status endpoint.",
      summary: "Retry single message",
      value: { msg_ids: [521] },
    },
    "retry-specific-messages": {
      description:
        "Requeue multiple archived messages by their msg_ids. Returns requeued count — may be less than requested if any IDs don't exist or belong to another user.",
      summary: "Retry specific messages",
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
      summary: "Neither field provided",
      value: {
        data: null,
        error: "Invalid input",
      },
    },
    "invalid-msg-ids-type": {
      description: "The msg_ids field must be an array of integers, not strings.",
      summary: "Invalid type for msg_ids",
      value: {
        data: null,
        error: "Invalid input",
      },
    },
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All 12 archived messages for the user requeued in one operation.",
      summary: "All archived requeued",
      value: { data: { requeued: 12 }, error: null },
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
  summary: "Retry failed Instagram sync imports",
  tags: ["Instagram"],
} satisfies EndpointSupplement;
