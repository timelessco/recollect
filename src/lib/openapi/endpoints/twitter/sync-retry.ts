/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncRetrySupplement = {
	path: "/twitter/sync/retry",
	method: "post",
	tags: ["Twitter"],
	summary: "Retry failed Twitter sync imports",
	description:
		"Requeues failed Twitter/X import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
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
			description: "Returns 400 — must provide either msg_ids or all: true.",
			value: {},
		},
		"invalid-msg-ids-type": {
			summary: "Validation: invalid msg_ids type",
			description: "Returns 400 — msg_ids must be an array of numbers.",
			value: { msg_ids: ["abc", "def"] },
		},
	},
	responseExamples: {
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
	response400Examples: {
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
	additionalResponses: {
		400: { description: "Invalid retry request" },
	},
} satisfies EndpointSupplement;
