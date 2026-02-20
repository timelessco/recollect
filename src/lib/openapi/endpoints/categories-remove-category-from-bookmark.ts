/**
 * @module Build-time only
 */
import {
	RemoveCategoryFromBookmarkPayloadSchema,
	RemoveCategoryFromBookmarkResponseSchema,
} from "@/app/api/category/remove-category-from-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerCategoriesRemoveCategoryFromBookmark() {
	registry.registerPath({
		method: "post",
		path: "/category/remove-category-from-bookmark",
		tags: ["Bookmarks"],
		summary: "Remove a category from a bookmark",
		description:
			"Removes a category assignment from a bookmark. Cannot remove the Uncategorized (ID: 0) " +
			"category — it is auto-managed by the system. When the last real category is removed, " +
			"the bookmark is automatically assigned to Uncategorized. " +
			"Returns 404 if the bookmark is not found or the category association does not exist. " +
			"Returns 400 if attempting to remove the Uncategorized category.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: RemoveCategoryFromBookmarkPayloadSchema,
						example: {
							bookmark_id: 42,
							category_id: 7,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Category removed from bookmark",
				content: {
					"application/json": {
						schema: apiResponseSchema(RemoveCategoryFromBookmarkResponseSchema),
						example: {
							data: [{ bookmark_id: 42, category_id: 7 }],
							error: null,
						},
					},
				},
			},
			400: { description: "Cannot manually remove the Uncategorized category" },
			401: { $ref: "#/components/responses/Unauthorized" },
			404: {
				description: "Bookmark not found or category association not found",
			},
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
