/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const addTagToBookmarkSupplement = {
	path: "/tags/add-tag-to-bookmark",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Add a tag to a bookmark",
	description:
		"Assigns an existing tag to a bookmark. Returns the full list of tag assignments for the bookmark. Fails with 409 if the tag is already assigned.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: { bookmarkId: 42, tagId: 7 },
	responseExample: {
		data: [
			{
				id: 101,
				bookmark_id: 42,
				tag_id: 7,
				user_id: "550e8400-e29b-41d4-a716-446655440000",
				created_at: "2024-03-15T10:30:00Z",
			},
		],
		error: null,
	},
	additionalResponses: {
		409: { description: "Tag already assigned to this bookmark" },
	},
} satisfies EndpointSupplement;
