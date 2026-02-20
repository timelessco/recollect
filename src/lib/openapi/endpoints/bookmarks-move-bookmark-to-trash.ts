/**
 * @module Build-time only
 */
import {
	MoveBookmarkToTrashInputSchema,
	MoveBookmarkToTrashOutputSchema,
} from "@/app/api/bookmark/move-bookmark-to-trash/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksMoveBookmarkToTrash() {
	registry.registerPath({
		method: "post",
		path: "/bookmark/move-bookmark-to-trash",
		tags: ["Bookmarks"],
		summary: "Move bookmarks to trash or restore them",
		description:
			"Moves one or more bookmarks to trash (soft delete) or restores them from trash. Set isTrash: true to trash, isTrash: false to restore. Triggers revalidation for any affected public categories. Returns the updated bookmark records with their new trash timestamps.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: MoveBookmarkToTrashInputSchema,
						example: {
							data: [{ id: 42 }, { id: 43 }],
							isTrash: true,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmarks moved to trash or restored",
				content: {
					"application/json": {
						schema: apiResponseSchema(MoveBookmarkToTrashOutputSchema),
						example: {
							data: [
								{ id: 42, trash: "2024-03-15T10:30:00Z" },
								{ id: 43, trash: "2024-03-15T10:30:00Z" },
							],
							error: null,
						},
					},
				},
			},
			400: {
				description:
					"Invalid request: missing or invalid data array, or missing/non-boolean isTrash",
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
