/**
 * @module Build-time only
 */
import {
	TwitterSyncInputSchema,
	TwitterSyncOutputSchema,
} from "@/app/api/twitter/sync/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTwitterSync() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync",
		tags: ["Twitter"],
		summary: "Sync Twitter/X bookmarks",
		description:
			"Enqueues a batch of Twitter/X bookmarks for async archiving. " +
			"Deduplicates within the batch and against existing bookmarks. " +
			"Returns counts of inserted and skipped items.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: TwitterSyncInputSchema,
						example: {
							bookmarks: [
								{
									url: "https://twitter.com/user/status/1234567890",
									title: "Interesting tweet about TypeScript",
									description: "A thread about advanced TypeScript patterns",
									ogImage: null,
									type: "tweet",
									meta_data: { author: "username" },
									sort_index: "1234567890",
									inserted_at: "2024-03-15T10:30:00Z",
								},
							],
						},
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
						example: {
							data: { inserted: 85, skipped: 7 },
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid request body or bookmark data" },
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
