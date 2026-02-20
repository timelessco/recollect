/**
 * @module Build-time only
 */
import {
	ToggleBookmarkDiscoverablePayloadSchema,
	ToggleBookmarkDiscoverableResponseSchema,
} from "@/app/api/bookmark/toggle-discoverable-on-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksToggleDiscoverableOnBookmark() {
	registry.registerPath({
		method: "post",
		path: "/bookmark/toggle-discoverable-on-bookmark",
		tags: ["Bookmarks"],
		summary: "Toggle discoverable status on a bookmark",
		description:
			"Makes a bookmark publicly discoverable or removes its discoverability. When making discoverable, the bookmark must not be in trash. Removing discoverability is always allowed regardless of trash status. Returns 400 if the bookmark is not found, not owned by the user, or is trashed (when enabling).",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: ToggleBookmarkDiscoverablePayloadSchema,
						example: {
							bookmark_id: 42,
							make_discoverable: true,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmark discoverability updated",
				content: {
					"application/json": {
						schema: apiResponseSchema(ToggleBookmarkDiscoverableResponseSchema),
						example: {
							data: {
								id: 42,
								make_discoverable: "2024-03-15T10:30:00Z",
							},
							error: null,
						},
					},
				},
			},
			400: {
				description:
					"Bookmark not found, permission denied, or bookmark is trashed",
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
