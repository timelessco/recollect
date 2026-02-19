/**
 * @module Build-time only
 */
import { CreateCategoryPayloadSchema } from "@/app/api/category/create-user-category/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { CategoryRowSchema } from "@/lib/openapi/schemas/shared";

export function registerCategoriesCreateUserCategory() {
	registry.registerPath({
		method: "post",
		path: "/category/create-user-category",
		tags: ["categories"],
		summary: "Create a new category",
		description:
			"Creates a new category for the authenticated user. The category name must be unique " +
			"(case-insensitive) for this user. A URL-safe slug is auto-generated from the name. " +
			"Optionally updates the user profile's category order to include the new category. " +
			"Returns 409 if a category with the same name already exists.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: CreateCategoryPayloadSchema,
						example: {
							name: "AI Research",
							category_order: [1, 2, 3],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Newly created category",
				content: {
					"application/json": {
						schema: apiResponseSchema(CategoryRowSchema),
						example: {
							data: {
								id: 15,
								category_name: "AI Research",
								category_slug: "ai-research-abc123",
								category_views: null,
								created_at: "2024-03-15T10:30:00Z",
								icon: null,
								icon_color: null,
								is_public: false,
								order_index: 0,
								user_id: "usr_abc123",
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
