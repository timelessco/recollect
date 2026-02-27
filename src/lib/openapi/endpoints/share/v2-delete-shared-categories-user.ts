/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2DeleteSharedCategoriesUserSupplement = {
	path: "/v2/share/delete-shared-categories-user",
	method: "delete",
	tags: ["Share"],
	summary: "Remove a collaborator from a shared category",
	description:
		"Deletes the shared_categories row matching the given ID and the authenticated user's user_id. Returns 404 when the row is not found or does not belong to the caller.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"delete-collaborator": {
			summary: "Delete a shared category by ID",
			description: "Removes the row with id=1 owned by the authenticated user.",
			value: {
				id: 1,
			} as const,
		},
	},
	responseExamples: {
		"deleted-row": {
			summary: "Row deleted successfully",
			description: "Returns the deleted shared_categories row in an array.",
			value: {
				data: [
					{
						id: 1,
						created_at: "2024-03-15T10:30:00+00:00",
						category_id: 42,
						email: "collaborator@example.com",
						edit_access: true,
						user_id: "550e8400-e29b-41d4-a716-446655440000",
						category_views: {
							bookmarksView: "moodboard",
							sortBy: "date-sort-ascending",
						},
						is_accept_pending: false,
					},
				],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		404: {
			description:
				"Shared category not found — row does not exist or does not belong to the caller",
		},
	},
} satisfies EndpointSupplement;
