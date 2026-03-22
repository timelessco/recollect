import { registry, serviceRoleAuth } from "@/lib/openapi/registry";

/**
 * @module Build-time only
 */
import { edgeFunctionServers } from "../edge-function-servers";

export function registerEdgeProcessTwitterImports() {
  registry.registerPath({
    description:
      "Returns the worker status and queue name. No authentication required.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`.",
    method: "get",
    path: "/process-twitter-imports",
    responses: {
      200: {
        content: {
          "application/json": {
            examples: {
              "health-check": {
                summary: "Worker healthy",
                value: { queue: "twitter_imports", status: "ok" },
              },
            },
            schema: {
              properties: {
                queue: { type: "string" as const },
                status: { type: "string" as const },
              },
              required: ["status", "queue"],
              type: "object" as const,
            },
          },
        },
        description: "Worker is healthy",
      },
    },
    security: [],
    servers: edgeFunctionServers,
    summary: "Health check for Twitter import worker",
    tags: ["Twitter"],
  });

  registry.registerPath({
    description:
      "Processes pending pgmq messages in the Twitter imports queue. Handles 2 message types: `create_bookmark` and `link_bookmark_category`. Each invocation drains one batch. Requires a Supabase service role token — not a user JWT.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`. Set the service role key as Bearer token in Scalar's Auth panel.",
    method: "post",
    path: "/process-twitter-imports",
    request: {
      body: {
        content: {
          "application/json": {
            examples: {
              "invoke-worker": {
                description: "Empty body triggers queue processing",
                summary: "Invoke worker",
                value: {},
              },
            },
            schema: { type: "object" as const },
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            examples: {
              "batch-processed": {
                summary: "Batch processed",
                value: { archived: 1, processed: 3, retry: 1, skipped: 0 },
              },
              "queue-empty": {
                summary: "Queue empty",
                value: {
                  archived: 0,
                  message: "Queue empty",
                  processed: 0,
                  retry: 0,
                  skipped: 0,
                },
              },
            },
            schema: { $ref: "#/components/schemas/WorkerResponse" },
          },
        },
        description: "Queue processed successfully",
      },
      401: { $ref: "#/components/responses/Unauthorized" },
      500: { $ref: "#/components/responses/InternalError" },
    },
    security: [{ [serviceRoleAuth.name]: [] }],
    servers: edgeFunctionServers,
    summary: "Process Twitter import queue",
    tags: ["Twitter"],
  });
}
