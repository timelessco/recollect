/**
 * @module Build-time only
 */
import {
	ClearBookmarkTrashInputSchema,
	ClearBookmarkTrashOutputSchema,
} from "@/app/api/bookmark/clear-bookmark-trash/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksClearBookmarkTrash() {
	registry.registerPath({
		method: "post",
		path: "/bookmark/clear-bookmark-trash",
		tags: ["Bookmarks"],
		summary: "Clear all trashed bookmarks",
		description:
			"Permanently deletes all bookmarks in the authenticated user's trash. " +
			"Processes up to 1000 bookmarks per batch. Returns the total deleted count. " +
			"Idempotent — calling with an empty trash returns deletedCount: 0.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: ClearBookmarkTrashInputSchema,
						example: {},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Trash cleared successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(ClearBookmarkTrashOutputSchema),
						example: {
							data: {
								deletedCount: 12,
								message: "Deleted 12 bookmarks",
							},
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
