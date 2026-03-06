/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2BookmarksDeleteNonCascadeSupplement = {
	path: "/v2/bookmarks/delete/non-cascade",
	method: "delete",
	tags: ["Bookmarks"],
	summary: "Delete a bookmark without cascade (test cleanup)",
	description:
		"Deletes a single bookmark row by ID without removing associated foreign key data or storage objects. Filters by user_id to prevent cross-user deletion. Primarily used by Cypress e2e tests for cleanup.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"delete-by-id": {
			summary: "Delete bookmark by ID",
			description:
				"Removes the bookmark row with id=42 owned by the authenticated user.",
			value: {
				data: { id: 42 },
			} as const,
		},
	},
	responseExamples: {
		success: {
			summary: "Bookmark deleted successfully",
			description: "Returns null data on successful deletion.",
			value: {
				data: null,
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"missing-id": {
			summary: "Missing bookmark ID",
			description: "Fails when the data.id field is missing.",
			value: {
				data: null,
				error: "data.id: Required",
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "Invalid request body or missing bookmark ID" },
	},
} satisfies EndpointSupplement;
