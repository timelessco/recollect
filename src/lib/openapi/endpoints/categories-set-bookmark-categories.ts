/**
 * @module Build-time only
 */
import {
	SetBookmarkCategoriesPayloadSchema,
	SetBookmarkCategoriesResponseSchema,
} from "@/app/api/category/set-bookmark-categories/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerCategoriesSetBookmarkCategories() {
	registry.registerPath({
		method: "post",
		path: "/category/set-bookmark-categories",
		tags: ["Bookmarks"],
		summary: "Replace all categories on a bookmark",
		description:
			"Atomically replaces all category assignments for a bookmark. All existing assignments are removed and replaced with the provided list. The caller must own the bookmark and have access to all specified categories. Maximum 100 category IDs. No duplicate IDs allowed. Triggers revalidation for all affected public categories (old and new).",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: SetBookmarkCategoriesPayloadSchema,
						example: {
							bookmark_id: 42,
							category_ids: [7, 8, 9],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Current category assignments after replacement",
				content: {
					"application/json": {
						schema: apiResponseSchema(SetBookmarkCategoriesResponseSchema),
						example: {
							data: [
								{ bookmark_id: 42, category_id: 7 },
								{ bookmark_id: 42, category_id: 8 },
								{ bookmark_id: 42, category_id: 9 },
							],
							error: null,
						},
					},
				},
			},
			400: {
				description:
					"Invalid request: invalid bookmark_id, max 100 category IDs, or duplicate IDs",
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: {
				description: "Bookmark not owned or no access to specified categories",
			},
			404: { description: "Bookmark not found" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
