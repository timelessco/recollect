/**
 * @module Build-time only
 */
import {
	RemoveTagFromBookmarkPayloadSchema,
	RemoveTagFromBookmarkResponseSchema,
} from "@/app/api/tags/remove-tag-from-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTagsRemoveTagFromBookmark() {
	registry.registerPath({
		method: "post",
		path: "/tags/remove-tag-from-bookmark",
		tags: ["Bookmarks"],
		summary: "Remove a tag from a bookmark",
		description:
			"Removes a tag assignment from a bookmark. Both the bookmark and tag must be owned by the " +
			"authenticated user. Returns 403 if ownership check fails. " +
			"Returns 404 if the tag was not assigned to the bookmark.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: RemoveTagFromBookmarkPayloadSchema,
						example: {
							bookmarkId: 42,
							tagId: 7,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Tag removed from bookmark",
				content: {
					"application/json": {
						schema: apiResponseSchema(RemoveTagFromBookmarkResponseSchema),
						example: {
							data: [
								{
									id: 101,
									bookmark_id: 42,
									tag_id: 7,
									user_id: "usr_abc123",
									created_at: "2024-03-15T10:30:00Z",
								},
							],
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: { description: "User does not own the bookmark or tag" },
			404: { description: "Tag was not assigned to this bookmark" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
