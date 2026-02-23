/**
 * @module Build-time only
 */
import {
	InstagramSyncInputSchema,
	InstagramSyncOutputSchema,
} from "@/app/api/instagram/sync/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { z } from "zod";

import {
	instagramSync400Examples,
	instagramSyncRequestExamples,
	instagramSyncResponseExamples,
} from "./sync-examples";

export function registerInstagramSync() {
	registry.registerPath({
		method: "post",
		path: "/instagram/sync",
		tags: ["Instagram"],
		summary: "Sync Instagram bookmarks",
		description:
			"Enqueues a batch of Instagram bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: InstagramSyncInputSchema,
						examples: instagramSyncRequestExamples,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmarks successfully enqueued",
				content: {
					"application/json": {
						schema: apiResponseSchema(InstagramSyncOutputSchema),
						examples: instagramSyncResponseExamples,
					},
				},
			},
			400: {
				description: "Invalid request body or bookmark data",
				content: {
					"application/json": {
						schema: apiResponseSchema(z.null()),
						examples: instagramSync400Examples,
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
