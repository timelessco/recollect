/**
 * @module Build-time only
 */
import {
	AddCategoryToBookmarksPayloadSchema,
	AddCategoryToBookmarksResponseSchema,
} from "@/app/api/category/add-category-to-bookmarks/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerCategoriesAddCategoryToBookmarks() {
	registry.registerPath({
		method: "post",
		path: "/category/add-category-to-bookmarks",
		tags: ["Bookmarks"],
		summary: "Assign a category to multiple bookmarks",
		description:
			"Assigns a category to multiple bookmarks in a single atomic operation. " +
			"All bookmarks must be owned by the caller. The caller must have access to the category " +
			"(owner or collaborator with edit access). Accepts 1–100 bookmark IDs. " +
			"Returns only the newly-created assignments (existing ones are skipped).",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: AddCategoryToBookmarksPayloadSchema,
						example: {
							bookmark_ids: [42, 43, 44],
							category_id: 7,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Category assigned to the specified bookmarks",
				content: {
					"application/json": {
						schema: apiResponseSchema(AddCategoryToBookmarksResponseSchema),
						example: {
							data: [
								{ bookmark_id: 42, category_id: 7 },
								{ bookmark_id: 43, category_id: 7 },
								{ bookmark_id: 44, category_id: 7 },
							],
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: { description: "Bookmarks not owned or no category access" },
			404: { description: "Category not found" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
