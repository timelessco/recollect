import { bearerAuth, registry } from "@/lib/openapi/registry";
import {
	AddTagToBookmarkPayloadSchema,
	AddTagToBookmarkResponseSchema,
} from "@/app/api/tags/add-tag-to-bookmark/route";

export function registerTagsAddTagToBookmark() {
	registry.registerPath({
		method: "post",
		path: "/tags/add-tag-to-bookmark",
		summary: "Add a tag to a bookmark",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": { schema: AddTagToBookmarkPayloadSchema },
				},
			},
		},
		responses: {
			200: {
				description: "Tag successfully added to bookmark",
				content: {
					"application/json": { schema: AddTagToBookmarkResponseSchema },
				},
			},
			401: { description: "Not authenticated" },
			403: { description: "Forbidden" },
			409: { description: "Tag already assigned to bookmark" },
		},
	});
}
