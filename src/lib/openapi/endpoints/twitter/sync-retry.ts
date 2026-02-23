/**
 * @module Build-time only
 */
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import {
	ImportRetryInputSchema,
	ImportRetryOutputSchema,
} from "@/lib/openapi/schemas/shared";
import { z } from "zod";

export function registerTwitterSyncRetry() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync/retry",
		tags: ["Twitter"],
		summary: "Retry failed Twitter sync imports",
		description:
			"Requeues failed Twitter/X import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: ImportRetryInputSchema,
						examples: {
							"retry-specific-messages": {
								summary: "Retry specific messages by msg_id",
								description:
									"Re-queues archived messages by their IDs for another processing attempt.",
								value: { msg_ids: [1, 2, 3] },
							},
							"retry-single-message": {
								summary: "Retry a single message",
								description: "Re-queue a single archived message by its ID.",
								value: { msg_ids: [1] },
							},
							"retry-all-archived": {
								summary: "Retry all archived failures",
								description:
									"Re-queues all archived (failed) messages for the authenticated user.",
								value: { all: true },
							},
							"empty-msg-ids-array": {
								summary: "Validation: empty msg_ids array",
								description: "Returns 400 — msg_ids must have at least 1 item.",
								value: { msg_ids: [] },
							},
							"empty-object": {
								summary: "Validation: empty object body",
								description:
									"Returns 400 — must provide either msg_ids or all: true.",
								value: {},
							},
							"invalid-msg-ids-type": {
								summary: "Validation: invalid msg_ids type",
								description:
									"Returns 400 — msg_ids must be an array of numbers.",
								value: { msg_ids: ["abc", "def"] },
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
								summary: "All archived messages requeued",
								value: { data: { requeued: 5 }, error: null },
							},
						},
					},
				},
			},
			400: {
				description: "Invalid retry request",
				content: {
					"application/json": {
						schema: apiResponseSchema(z.null()),
						examples: {
							"empty-msg-ids-array": {
								summary: "Empty array rejected",
								value: {
									data: null,
									error: "Too small: expected array to have >=1 items",
								},
							},
							"empty-object": {
								summary: "Empty object rejected",
								value: {
									data: null,
									error: "Invalid input",
								},
							},
							"invalid-msg-ids-type": {
								summary: "Invalid type rejected",
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
