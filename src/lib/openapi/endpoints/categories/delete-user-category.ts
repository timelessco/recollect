/**
 * @module Build-time only
 */
import { DeleteCategoryInputSchema } from "@/app/api/category/delete-user-category/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { CategoryRowSchema } from "@/lib/openapi/schemas/shared";

export function registerCategoriesDeleteUserCategory() {
	registry.registerPath({
		method: "post",
		path: "/category/delete-user-category",
		tags: ["Categories"],
		summary: "Delete a category",
		description:
			"Deletes a category owned by the authenticated user. This cascades: shared access records are removed, owner's bookmarks are moved to trash, all category-bookmark junction entries are deleted, and the category itself is deleted. Collaborators lose the category reference but their bookmarks are not trashed. Returns 403 if the caller is not the category owner. Returns 404 if not found.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: DeleteCategoryInputSchema,
						example: {
							category_id: 7,
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Deleted category record",
				content: {
					"application/json": {
						schema: apiResponseSchema(CategoryRowSchema),
						example: {
							data: {
								id: 7,
								category_name: "AI Research",
								category_slug: "ai-research-abc123",
								category_views: null,
								created_at: "2024-01-10T08:00:00Z",
								icon: "brain",
								icon_color: "#6366f1",
								is_public: false,
								order_index: 2,
								user_id: "550e8400-e29b-41d4-a716-446655440000",
							},
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			403: { description: "Only the category owner can delete it" },
			404: { description: "Category not found or already deleted" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
