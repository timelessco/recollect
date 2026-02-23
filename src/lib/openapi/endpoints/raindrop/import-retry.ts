/**
 * @module Build-time only
 */
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import {
	ImportRetryInputSchema,
	ImportRetryOutputSchema,
} from "@/lib/openapi/schemas/shared";

export function registerRaindropImportRetry() {
	registry.registerPath({
		method: "post",
		path: "/raindrop/import/retry",
		tags: ["Raindrop"],
		summary: "Retry failed Raindrop import items",
		description:
			"Requeues failed Raindrop import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: ImportRetryInputSchema,
						examples: {
							"retry-specific-messages": {
								summary: "Retry specific messages",
								description:
									"Requeue multiple archived messages by their msg_ids. Returns requeued count — may be less than requested if any IDs don't exist or belong to another user.",
								value: { msg_ids: [1, 2, 3] },
							},
							"retry-single-message": {
								summary: "Retry single message",
								description:
									"Requeue a single archived message by its msg_id. Useful when retrying one specific failure from the status endpoint.",
								value: { msg_ids: [1] },
							},
							"retry-all-archived": {
								summary: "Retry all archived",
								description:
									"Requeue ALL archived messages for the authenticated user in one call. Returns total requeued count.",
								value: { all: true },
							},
							"empty-msg-ids-array": {
								summary: "Validation: empty array (400)",
								description:
									"msg_ids array must have at least one element. An empty array fails validation.",
								value: { msg_ids: [] },
							},
							"empty-object": {
								summary: "Validation: neither field provided (400)",
								description:
									"Request body must include either msg_ids or all:true. An empty object has neither.",
								value: {},
							},
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Messages requeued for retry",
				content: {
					"application/json": {
						schema: apiResponseSchema(ImportRetryOutputSchema),
						examples: {
							"retry-specific-messages": {
								summary: "Specific messages requeued",
								value: { data: { requeued: 3, requested: 3 }, error: null },
							},
							"retry-single-message": {
								summary: "Single message requeued",
								value: { data: { requeued: 1, requested: 1 }, error: null },
							},
							"retry-all-archived": {
								summary: "All archived requeued",
								value: { data: { requeued: 10, requested: 10 }, error: null },
							},
						},
					},
				},
			},
			400: {
				description: "Invalid retry request",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								data: { type: "null" },
								error: { type: "string" },
							},
							required: ["data", "error"],
						},
						examples: {
							"empty-msg-ids-array": {
								summary: "Empty array rejected",
								value: {
									data: null,
									error: "Too small: expected array to have >=1 items",
								},
							},
							"empty-object": {
								summary: "Neither field provided",
								value: {
									data: null,
									error: "Invalid input",
								},
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
