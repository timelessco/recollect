/**
 * @module Build-time only
 */
import { UpdateCategoryPayloadSchema } from "@/app/api/category/update-user-category/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { CategoryRowSchema } from "@/lib/openapi/schemas/shared";

export function registerCategoriesUpdateUserCategory() {
	registry.registerPath({
		method: "post",
		path: "/category/update-user-category",
		tags: ["Categories"],
		summary: "Update a category",
		description:
			"Updates one or more properties of a category owned by the authenticated user. All updateData fields are optional — only provided fields are updated. The category_views field accepts additional properties (additionalProperties: true) for flexible JSONB view configuration. Triggers revalidation for public categories on any field change. Returns 409 if renaming to a name that already exists for this user.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: UpdateCategoryPayloadSchema,
						example: {
							category_id: 7,
							updateData: {
								category_name: "AI & ML Research",
								is_public: true,
								icon: "brain",
								icon_color: "#6366f1",
							},
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Updated category record",
				content: {
					"application/json": {
						schema: apiResponseSchema(CategoryRowSchema),
						example: {
							data: {
								id: 7,
								category_name: "AI & ML Research",
								category_slug: "ai-research-abc123",
								category_views: { bookmarksView: "grid", sortBy: "date" },
								created_at: "2024-01-10T08:00:00Z",
								icon: "brain",
								icon_color: "#6366f1",
								is_public: true,
								order_index: 2,
								user_id: "550e8400-e29b-41d4-a716-446655440000",
							},
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			409: {
				description: "A category with this name already exists for this user",
			},
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
