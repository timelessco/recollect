/**
 * @module Build-time only
 */
import {
	CreateAndAssignTagPayloadSchema,
	CreateAndAssignTagResponseSchema,
} from "@/app/api/tags/create-and-assign-tag/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTagsCreateAndAssignTag() {
	registry.registerPath({
		method: "post",
		path: "/tags/create-and-assign-tag",
		tags: ["Bookmarks"],
		summary: "Create a new tag and assign it to a bookmark",
		description:
			"Atomically creates a new tag and assigns it to the specified bookmark in a single transaction. The caller must own both the bookmark and the tag name must be unique for this user. Returns 403 if the bookmark is not found or not owned by the user. Returns 409 if the user already has a tag with the same name.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: CreateAndAssignTagPayloadSchema,
						example: {
							name: "typescript",
							bookmarkId: 42,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Tag created and assigned to the bookmark",
				content: {
					"application/json": {
						schema: apiResponseSchema(CreateAndAssignTagResponseSchema),
						example: {
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
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: { description: "Bookmark not found or not owned by user" },
			409: { description: "Tag with this name already exists for this user" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
