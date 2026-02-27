/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const deleteUserCategorySupplement = {
	path: "/category/delete-user-category",
	method: "post",
	tags: ["Categories"],
	summary: "Delete a category",
	description:
		"Deletes a category owned by the authenticated user. This cascades: shared access records are removed, owner's bookmarks are moved to trash, all category-bookmark junction entries are deleted, and the category itself is deleted. Collaborators lose the category reference but their bookmarks are not trashed. Returns 403 if the caller is not the category owner. Returns 404 if not found.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		category_id: 7,
	},
	responseExample: {
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
	additionalResponses: {
		403: { description: "Only the category owner can delete it" },
		404: { description: "Category not found or already deleted" },
	},
} satisfies EndpointSupplement;
