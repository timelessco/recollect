/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchUserProfileSupplement = {
	path: "/v2/profiles/fetch-user-profile",
	method: "get",
	tags: ["Profiles"],
	summary: "Fetch authenticated user profile with auto-provisioning",
	description:
		"Returns the full profile for the authenticated user. Has side effects: if `avatar` query param is provided and the user has no profile picture, updates `profile_pic` with the OAuth avatar URL. If the user has no `user_name`, auto-generates one from their email (appending a unique suffix if the name is already taken).",
	security: [{ [bearerAuth.name]: [] }, {}],
	parameterExamples: {
		avatar: {
			"with-avatar-sync": {
				summary: "Sync OAuth avatar",
				description:
					"Pass an OAuth avatar URL — updates `profile_pic` if the user has none set.",
				value: "https://example.com/avatars/user-123.jpg",
			},
			"no-avatar": {
				summary: "No avatar param",
				description:
					"Omit `avatar` — returns the profile without triggering a profile_pic update.",
				value: "",
			},
		},
	},
	responseExamples: {
		"full-profile": {
			summary: "Fully populated profile",
			description:
				"Call without `avatar` param — returns all profile fields for the authenticated user.",
			value: {
				data: [
					{
						ai_features_toggle: { auto_assign_collections: true },
						api_key: null,
						bookmark_count: 0,
						bookmarks_view: {
							everything: {
								moodboardColumns: [50],
								cardContentViewArray: [
									"cover",
									"title",
									"tags",
									"info",
									"description",
								],
								bookmarksView: "moodboard",
								sortBy: "date-sort-ascending",
							},
						},
						category_order: [577, 724],
						display_name: "User",
						email: "user@example.com",
						id: "550e8400-e29b-41d4-a716-446655440000",
						preferred_og_domains: ["substack.com"],
						profile_pic:
							"https://example.com/storage/v1/object/public/avatars/user-123.jpg",
						provider: "google",
						user_name: "user",
					},
				],
				error: null,
			} as const,
		},
		"nullable-fields": {
			summary: "Profile with nullable fields",
			description:
				"User with minimal data — nullable fields return null or empty arrays.",
			value: {
				data: [
					{
						ai_features_toggle: { auto_assign_collections: true },
						api_key: null,
						bookmark_count: 0,
						bookmarks_view: null,
						category_order: null,
						display_name: null,
						email: "another@example.com",
						id: "550e8400-e29b-41d4-a716-446655440001",
						preferred_og_domains: null,
						profile_pic: null,
						provider: "email",
						user_name: "another",
					},
				],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		401: { description: "Not authenticated" },
	},
} satisfies EndpointSupplement;
