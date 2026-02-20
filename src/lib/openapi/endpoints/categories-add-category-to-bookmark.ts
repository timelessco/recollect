/**
 * @module Build-time only
 */
import {
	AddCategoryToBookmarkPayloadSchema,
	AddCategoryToBookmarkResponseSchema,
} from "@/app/api/category/add-category-to-bookmark/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerCategoriesAddCategoryToBookmark() {
	registry.registerPath({
		method: "post",
		path: "/category/add-category-to-bookmark",
		tags: ["Bookmarks"],
		summary: "Add a category to a bookmark",
		description:
			"Assigns a category to a single bookmark. The caller must own the bookmark and have access to the category (owner or collaborator with edit access). Use category_id: 0 to assign to the Uncategorized collection. Returns 404 if the bookmark or category is not found. Returns 403 if access is denied.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: AddCategoryToBookmarkPayloadSchema,
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
				description: "Category assigned to bookmark",
				content: {
					"application/json": {
						schema: apiResponseSchema(AddCategoryToBookmarkResponseSchema),
						example: {
							data: [{ bookmark_id: 42, category_id: 7 }],
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: { description: "No edit access to this category" },
			404: { description: "Bookmark or category not found" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
