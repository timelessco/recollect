/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const removeTagFromBookmarkSupplement = {
	path: "/tags/remove-tag-from-bookmark",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Remove a tag from a bookmark",
	description:
		"Removes a tag assignment from a bookmark. Both the bookmark and tag must be owned by the authenticated user. Returns 403 if ownership check fails. Returns 404 if the tag was not assigned to the bookmark.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		bookmarkId: 42,
		tagId: 7,
	},
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
		403: { description: "User does not own the bookmark or tag" },
		404: { description: "Tag was not assigned to this bookmark" },
	},
} satisfies EndpointSupplement;
