/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const createUserCategorySupplement = {
	path: "/category/create-user-category",
	method: "post",
	tags: ["Categories"],
	summary: "Create a new category",
	description:
		"Creates a new category for the authenticated user. The category name must be unique (case-insensitive) for this user. A URL-safe slug is auto-generated from the name. Optionally updates the user profile's category order to include the new category. Returns 409 if a category with the same name already exists.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		name: "AI Research",
		category_order: [1, 2, 3],
	},
	responseExample: {
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
			user_id: "550e8400-e29b-41d4-a716-446655440000",
		},
		error: null,
	},
	additionalResponses: {
		400: { description: "Invalid or missing request fields" },
		409: {
			description: "A category with this name already exists for this user",
		},
	},
} satisfies EndpointSupplement;
