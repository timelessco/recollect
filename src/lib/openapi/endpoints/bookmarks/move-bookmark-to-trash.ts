/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const moveBookmarkToTrashSupplement = {
	path: "/bookmark/move-bookmark-to-trash",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Move bookmarks to trash or restore them",
	description:
		"Moves one or more bookmarks to trash (soft delete) or restores them from trash. Set isTrash: true to trash, isTrash: false to restore. Triggers revalidation for any affected public categories. Returns the updated bookmark records with their new trash timestamps.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		data: [{ id: 42 }, { id: 43 }],
		isTrash: true,
	},
	responseExample: {
		data: [
			{ id: 42, trash: "2024-03-15T10:30:00Z" },
			{ id: 43, trash: "2024-03-15T10:30:00Z" },
		],
		error: null,
	},
	additionalResponses: {
		400: {
			description:
				"Invalid request: missing or invalid data array, or missing/non-boolean isTrash",
		},
	},
} satisfies EndpointSupplement;
