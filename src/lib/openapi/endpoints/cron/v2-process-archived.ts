/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { serviceRoleAuth } from "@/lib/openapi/registry";

export const v2ProcessArchivedSupplement = {
  additionalResponses: {
    401: { description: "Missing or invalid service role bearer token" },
    503: {
      description:
        "Database error while retrying archives, or unexpected RPC response shape from admin_retry_ai_embeddings_archives / retry_ai_embeddings_archive",
    },
  },
  description:
    "Retries archived AI embeddings queue items. Supports three modes via a discriminated input union: `retry_all: true` retries every archived item, `count` retries the next N items, or `msg_ids` retries a specific set of message IDs. Requires Supabase service role key as bearer token (not a user JWT). Returns bare `{ requested, requeued }` — `requested` is null for the `retry_all` mode.",
  method: "post",
  path: "/v2/cron/process-archived",
  security: [{ [serviceRoleAuth.name]: [] }],
  summary: "Retry archived AI embeddings queue items",
  tags: ["Cron"],
} satisfies EndpointSupplement;
