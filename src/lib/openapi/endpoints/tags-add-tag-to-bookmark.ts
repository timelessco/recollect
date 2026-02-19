import {
	AddTagToBookmarkPayloadSchema,
	AddTagToBookmarkResponseSchema,
} from "@/app/api/tags/add-tag-to-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTagsAddTagToBookmark() {
	registry.registerPath({
		method: "post",
		path: "/tags/add-tag-to-bookmark",
		tags: ["bookmarks"],
		summary: "Add a tag to a bookmark",
		description:
			"Assigns an existing tag to a bookmark. Returns the full list of tag assignments " +
			"for the bookmark. Fails with 409 if the tag is already assigned.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: AddTagToBookmarkPayloadSchema,
						example: { bookmarkId: 42, tagId: 7 },
					},
				},
			},
		},
		responses: {
			200: {
				description: "Tag successfully added to bookmark",
				content: {
					"application/json": {
						schema: apiResponseSchema(AddTagToBookmarkResponseSchema),
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
			409: { description: "Tag already assigned to this bookmark" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
