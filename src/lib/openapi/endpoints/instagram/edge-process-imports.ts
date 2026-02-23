/**
 * @module Build-time only
 */
import { edgeFunctionServers } from "../edge-function-servers";
import { workerResponseSchema } from "../edge-function-schemas";
import { registry, serviceRoleAuth } from "@/lib/openapi/registry";

export function registerEdgeProcessInstagramImports() {
	registry.registerPath({
		method: "get",
		path: "/process-instagram-imports",
		servers: edgeFunctionServers,
		tags: ["Instagram"],
		security: [],
		summary: "Health check for Instagram import worker",
		description:
			"Returns the worker status and queue name. No authentication required.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`.",
		responses: {
			200: {
				description: "Worker is healthy",
				content: {
					"application/json": {
						schema: {
							type: "object" as const,
							properties: {
								status: { type: "string" as const },
								queue: { type: "string" as const },
							},
							required: ["status", "queue"],
						},
						examples: {
							"health-check": {
								summary: "Worker healthy",
								value: { status: "ok", queue: "instagram_imports" },
							},
						},
					},
				},
			},
		},
	});

	registry.registerPath({
		method: "post",
		path: "/process-instagram-imports",
		servers: edgeFunctionServers,
		tags: ["Instagram"],
		summary: "Process Instagram import queue",
		description:
			"Processes pending pgmq messages in the Instagram imports queue. Each invocation drains one batch. Requires a Supabase service role token — not a user JWT.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`. Set the service role key as Bearer token in Scalar's Auth panel.",
		security: [{ [serviceRoleAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: { type: "object" as const },
						examples: {
							"invoke-worker": {
								summary: "Invoke worker",
								description: "Empty body triggers queue processing",
								value: {},
							},
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Queue processed successfully",
				content: {
					"application/json": {
						schema: workerResponseSchema,
						examples: {
							"queue-empty": {
								summary: "Queue empty",
								value: {
									processed: 0,
									archived: 0,
									skipped: 0,
									retry: 0,
									message: "Queue empty",
								},
							},
							"batch-processed": {
								summary: "Batch processed",
								value: { processed: 3, archived: 1, skipped: 0, retry: 1 },
							},
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
