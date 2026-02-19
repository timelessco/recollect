/**
 * @module Build-time only
 */
import {
	RaindropImportInputSchema,
	RaindropImportOutputSchema,
} from "@/app/api/raindrop/import/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerRaindropImport() {
	registry.registerPath({
		method: "post",
		path: "/raindrop/import",
		tags: ["raindrop"],
		summary: "Import Raindrop.io bookmarks",
		description:
			"Enqueues a batch of Raindrop.io bookmarks for async import. " +
			"Deduplicates within the batch and against existing bookmarks. " +
			"Returns counts of queued and skipped items.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: RaindropImportInputSchema,
						example: {
							bookmarks: [
								{
									title: "My Favorite Article",
									description: "A great read about web development",
									url: "https://example.com/article",
									ogImage: "https://example.com/og.jpg",
									category_name: "Tech",
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
				description: "Bookmarks successfully queued for import",
				content: {
					"application/json": {
						schema: apiResponseSchema(RaindropImportOutputSchema),
						example: {
							data: { queued: 150, skipped: 12 },
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
