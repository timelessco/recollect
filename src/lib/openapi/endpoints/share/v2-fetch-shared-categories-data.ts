/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchSharedCategoriesDataSupplement = {
	path: "/v2/share/fetch-shared-categories-data",
	method: "get",
	tags: ["Share"],
	summary: "List shared categories for the authenticated user",
	description:
		"Returns all shared categories where the user is a collaborator (matched by email) or owner (matched by user_id). Returns an empty array when the user has no shared categories.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"with-shared-categories": {
			summary: "User has shared categories",
			description:
				"No parameters needed — returns shared categories matched by email or user_id. Log in first via Scalar's auth.",
			value: {
				data: [
					{
						id: 1,
						created_at: "2024-03-15T10:30:00+00:00",
						category_id: 42,
						email: "user@example.com",
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
		"no-shared-categories": {
			summary: "User has no shared categories",
			description:
				"Authenticate as a user with no shared categories — returns empty array.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "User email not available (broken auth state)" },
	},
} satisfies EndpointSupplement;
