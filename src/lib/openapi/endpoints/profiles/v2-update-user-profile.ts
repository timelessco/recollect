/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2UpdateUserProfileSupplement = {
	path: "/v2/profiles/update-user-profile",
	method: "patch",
	tags: ["Profiles"],
	summary: "Update authenticated user's profile fields",
	description:
		"Updates one or more profile fields for the authenticated user. Accepts a partial `updateData` object — at least one field must be provided. Returns the full updated profile row.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"update-display-name": {
			summary: "Update display name",
			description: "Update only the display name field.",
			value: { updateData: { display_name: "Jane Smith" } },
		},
		"update-multiple-fields": {
			summary: "Update multiple fields",
			description: "Update display name and provider at the same time.",
			value: {
				updateData: { display_name: "Jane Smith", provider: "google" },
			},
		},
	},
	responseExamples: {
		"profile-updated": {
			summary: "Profile updated successfully",
			description:
				"Full profile row returned after update — all columns included.",
			value: {
				data: [
					{
						ai_features_toggle: { auto_assign_collections: true },
						api_key: null,
						bookmark_count: 42,
						bookmarks_view: null,
						category_order: [577, 724],
						display_name: "Jane Smith",
						email: "jane@example.com",
						id: "550e8400-e29b-41d4-a716-446655440000",
						preferred_og_domains: ["substack.com"],
						profile_pic: null,
						provider: "google",
						user_name: "janesmith",
					},
				],
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"empty-update-data": {
			summary: "Empty updateData object",
			description:
				"Sending an empty `updateData: {}` fails the refine check — at least one field must be provided.",
			value: {
				data: null,
				error: "Invalid request body",
			} as const,
		},
		"missing-update-data": {
			summary: "Missing updateData field",
			description:
				"The top-level `updateData` key was omitted from the request body.",
			value: {
				data: null,
				error: "Invalid request body",
			} as const,
		},
	},
	additionalResponses: {
		401: { description: "Not authenticated" },
		404: { description: "Profile not found" },
	},
} satisfies EndpointSupplement;
