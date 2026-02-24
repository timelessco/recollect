/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const raindropImportRetrySupplement = {
	path: "/raindrop/import/retry",
	method: "post",
	tags: ["Raindrop"],
	summary: "Retry failed Raindrop import items",
	description:
		"Requeues failed Raindrop import messages for retry. Accepts either a list of specific message IDs or a flag to retry all failures.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
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
			summary: "All archived requeued",
			value: { data: { requeued: 10 }, error: null },
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
			summary: "Neither field provided",
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
