/**
 * @module Build-time only
 */
import {
	DeleteBookmarkInputSchema,
	DeleteBookmarkOutputSchema,
} from "@/app/api/bookmark/delete-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksDeleteBookmark() {
	registry.registerPath({
		method: "post",
		path: "/bookmark/delete-bookmark",
		tags: ["Bookmarks"],
		summary: "Permanently delete bookmarks",
		description:
			"Permanently deletes one or more bookmarks by ID. The caller must own the bookmarks. " +
			"Processes in batches of 1000. Bookmarks in trash can be deleted directly — " +
			"this skips the trash and is irreversible.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: DeleteBookmarkInputSchema,
						example: {
							deleteData: [{ id: 42 }, { id: 43 }, { id: 44 }],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmarks permanently deleted",
				content: {
					"application/json": {
						schema: apiResponseSchema(DeleteBookmarkOutputSchema),
						example: {
							data: {
								deletedCount: 3,
								message: "Deleted 3 bookmark(s)",
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
