/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { serviceRoleAuth } from "@/lib/openapi/registry";

export const processArchivedSupplement = {
  description:
    "Retries archived AI embeddings queue items. Supports three modes: retry all archived items, retry a specific count, or retry specific message IDs. Requires Supabase service role key as bearer token (not a user JWT).",
  method: "post",
  path: "/cron/process-archived",
  requestExamples: {
    "retry-all": {
      description: "Retry all archived queue items regardless of count",
      summary: "Retry all",
      value: { retry_all: true },
    },
    "retry-by-count": {
      description: "Retry a specific number of archived queue items",
      summary: "Retry by count",
      value: { count: 100 },
    },
    "retry-by-ids": {
      description: "Retry specific archived queue items by their message IDs",
      summary: "Retry by message IDs",
      value: { msg_ids: [1, 2, 3] },
    },
  },
  responseExamples: {
    "retry-all-success": {
      description: "All archived items were successfully requeued",
      summary: "Retry all success",
      value: {
        data: { requested: null, requeued: 150 },
        error: null,
      },
    },
    "retry-by-count-success": {
      description: "Requested count of items were requeued",
      summary: "Retry by count success",
      value: {
        data: { requested: 100, requeued: 95 },
        error: null,
      },
    },
    "retry-by-ids-success": {
      description: "Specific message IDs were requeued",
      summary: "Retry by IDs success",
      value: {
        data: { requested: 3, requeued: 3 },
        error: null,
      },
    },
  },
  security: [{ [serviceRoleAuth.name]: [] }],
  summary: "Retry archived AI embeddings queue items",
  tags: ["Cron"],
} satisfies EndpointSupplement;
