/**
 * @module Build-time only
 */
import { edgeFunctionServers } from "../edge-function-servers";
import { registry, serviceRoleAuth } from "@/lib/openapi/registry";

const workerResponseSchema = {
	type: "object" as const,
	properties: {
		processed: { type: "integer" as const },
		archived: { type: "integer" as const },
		skipped: { type: "integer" as const },
		retry: { type: "integer" as const },
		message: { type: "string" as const },
	},
	required: ["processed", "archived", "skipped", "retry"],
};

export function registerEdgeProcessTwitterImports() {
	registry.registerPath({
		method: "get",
		path: "/process-twitter-imports",
		servers: edgeFunctionServers,
		tags: ["Twitter"],
		summary: "Health check for Twitter import worker",
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
								value: { status: "ok", queue: "twitter_imports" },
							},
						},
					},
				},
			},
		},
	});

	registry.registerPath({
		method: "post",
		path: "/process-twitter-imports",
		servers: edgeFunctionServers,
		tags: ["Twitter"],
		summary: "Process Twitter import queue",
		description:
			"Processes pending pgmq messages in the Twitter imports queue. Handles 2 message types: `create_bookmark` and `link_bookmark_category`. Each invocation drains one batch. Requires a Supabase service role token — not a user JWT.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`. Set the service role key as Bearer token in Scalar's Auth panel.",
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
		},
	});
}
