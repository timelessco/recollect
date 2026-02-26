/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchUserTagsSupplement = {
	path: "/v2/tags/fetch-user-tags",
	method: "get",
	tags: ["Tags"],
	summary: "List all tags for the authenticated user",
	description:
		"Returns all tags created by the authenticated user. Returns an empty array when the user has no tags.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"with-tags": {
			summary: "User has tags",
			description: "Returns the full list of tags belonging to the user.",
			value: {
				data: [
					{
						id: 1,
						name: "reading-list",
						user_id: "550e8400-e29b-41d4-a716-446655440000",
						created_at: "2024-03-15T10:30:00Z",
					},
					{
						id: 2,
						name: "research",
						user_id: "550e8400-e29b-41d4-a716-446655440000",
						created_at: "2024-03-16T08:00:00Z",
					},
				],
				error: null,
			},
		},
		"no-tags": {
			summary: "User has no tags",
			description:
				"Returns an empty array when the user has not created any tags.",
			value: {
				data: [],
				error: null,
			},
		},
	},
} satisfies EndpointSupplement;
