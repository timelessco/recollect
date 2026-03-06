/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2UpdateSharedCategoryUserRoleSupplement = {
	path: "/v2/share/update-shared-category-user-role",
	method: "patch",
	tags: ["Share"],
	summary: "Update a collaborator's role in a shared category",
	description:
		"Updates fields on a shared_categories row. The row must match the given id and either the caller's user_id or email (dual-match via .or()). Primarily used to toggle edit_access.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"toggle-edit-access": {
			summary: "Grant edit access to a collaborator",
			description:
				"Sets edit_access=true on the shared_categories row with id=1 where the caller matches by user_id or email.",
			value: {
				id: 1,
				updateData: {
					edit_access: true,
				},
			} as const,
		},
	},
	responseExamples: {
		"updated-row": {
			summary: "Role updated successfully",
			description: "Returns the updated shared_categories row in an array.",
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
		"no-match": {
			summary: "No row matched — empty array returned",
			description:
				"If no row matches the id + (user_id or email) filter, returns an empty data array with no error.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
} satisfies EndpointSupplement;
