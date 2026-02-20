/**
 * @module Build-time only
 */
import {
	InstagramSyncInputSchema,
	InstagramSyncOutputSchema,
} from "@/app/api/instagram/sync/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

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
						example: {
							bookmarks: [
								{
									url: "https://www.instagram.com/p/ABC123/",
									title: "Beautiful sunset photo",
									description: "A stunning view of the horizon",
									ogImage: "https://www.instagram.com/p/ABC123/media/?size=l",
									type: "instagram",
									meta_data: { shortcode: "ABC123" },
									saved_at: "2024-03-15T10:30:00Z",
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
						schema: apiResponseSchema(InstagramSyncOutputSchema),
						example: {
							data: { inserted: 42, skipped: 3 },
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
