/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2ProcessQueueSupplement = {
  description:
    "Reads one message from the `ai-embeddings` pgmq queue and dispatches it to the screenshot or AI enrichment worker. Uses a service-role client internally to bypass RLS. Public endpoint with no authentication (called by external cron).",
  method: "post",
  path: "/v2/process-queue",
  responseExample: {
    message: "Queue processed successfully",
  },
  security: [],
  summary: "Process the ai-embeddings queue (screenshots and AI enrichment)",
  tags: ["Cron"],
} satisfies EndpointSupplement;
