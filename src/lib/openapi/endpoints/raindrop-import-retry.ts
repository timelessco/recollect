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
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: ImportRetryInputSchema,
						examples: {
							specificMessages: {
								summary: "Retry specific messages",
								value: { msg_ids: [42, 43, 44] },
							},
							retryAll: {
								summary: "Retry all failed",
								value: { all: true },
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
						example: {
							data: { requeued: 10, requested: 10 },
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid retry request" },
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
