/**
 * @module Build-time only
 */
import {
	TwitterSyncInputSchema,
	TwitterSyncOutputSchema,
} from "@/app/api/twitter/sync/schema";
import { z } from "zod";

import {
	twitterSyncRequestExamples,
	twitterSyncResponse200Examples,
	twitterSyncResponse400Examples,
} from "./sync-examples";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTwitterSync() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync",
		tags: ["Twitter"],
		summary: "Sync Twitter/X bookmarks",
		description:
			"Enqueues a batch of Twitter/X bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: TwitterSyncInputSchema,
						examples: twitterSyncRequestExamples,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmarks successfully enqueued",
				content: {
					"application/json": {
						schema: apiResponseSchema(TwitterSyncOutputSchema),
						examples: twitterSyncResponse200Examples,
					},
				},
			},
			400: {
				description: "Invalid request body or bookmark data",
				content: {
					"application/json": {
						schema: apiResponseSchema(z.null()),
						examples: twitterSyncResponse400Examples,
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
