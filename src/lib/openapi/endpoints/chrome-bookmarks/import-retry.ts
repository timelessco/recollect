/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const chromeBookmarkImportRetrySupplement = {
  additionalResponses: {
    400: { description: "Invalid retry request" },
  },
  description:
    "Requeues failed Chrome bookmark import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
  method: "post",
  path: "/chrome-bookmarks/import/retry",
  requestExamples: {
    "retry-all-archived": {
      description:
        "Requeue ALL archived messages for the authenticated user in one call. Returns total requeued count.",
      summary: "Retry all archived",
      value: { all: true },
    },
    "retry-specific-messages": {
      description:
        "Requeue specific archived messages by their msg_ids. Returns requeued count — may be less than requested if any IDs don't exist or belong to another user.",
      summary: "Retry specific messages",
      value: { msg_ids: [42, 43, 44] },
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
  },
  responseExamples: {
    "retry-all-archived": {
      description: "All archived messages for the user requeued in one operation.",
      summary: "All archived requeued",
      value: { data: { requeued: 5 }, error: null },
    },
    "retry-specific-messages": {
      description: "All 3 requested messages found and requeued for processing.",
      summary: "Specific messages requeued",
      value: { data: { requested: 3, requeued: 3 }, error: null },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retry failed Chrome bookmark imports",
  tags: ["Chrome Bookmarks"],
} satisfies EndpointSupplement;
