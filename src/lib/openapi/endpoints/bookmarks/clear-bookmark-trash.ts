/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const clearBookmarkTrashSupplement = {
	path: "/bookmark/clear-bookmark-trash",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Clear all trashed bookmarks",
	description:
		"Permanently deletes all bookmarks in the authenticated user's trash. Processes up to 1000 bookmarks per batch. Returns the total deleted count. Idempotent — calling with an empty trash returns deletedCount: 0.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {},
	responseExample: {
		data: {
			deletedCount: 12,
			message: "Deleted 12 bookmarks",
		},
		error: null,
	},
} satisfies EndpointSupplement;
