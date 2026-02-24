/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const createAndAssignTagSupplement = {
	path: "/tags/create-and-assign-tag",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Create a new tag and assign it to a bookmark",
	description:
		"Atomically creates a new tag and assigns it to the specified bookmark in a single transaction. The caller must own both the bookmark and the tag name must be unique for this user. Returns 403 if the bookmark is not found or not owned by the user. Returns 409 if the user already has a tag with the same name.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		name: "typescript",
		bookmarkId: 42,
	},
	responseExample: {
		data: {
			tag: {
				id: 15,
				name: "typescript",
				user_id: "550e8400-e29b-41d4-a716-446655440000",
				created_at: "2024-03-15T10:30:00Z",
			},
			bookmarkTag: {
				id: 201,
				bookmark_id: 42,
				tag_id: 15,
				user_id: "550e8400-e29b-41d4-a716-446655440000",
				created_at: "2024-03-15T10:30:00Z",
			},
		},
		error: null,
	},
	additionalResponses: {
		403: { description: "Bookmark not found or not owned by user" },
		409: { description: "Tag with this name already exists for this user" },
	},
} satisfies EndpointSupplement;
