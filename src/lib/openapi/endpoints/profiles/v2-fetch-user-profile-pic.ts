/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchUserProfilePicSupplement = {
	path: "/v2/profiles/fetch-user-profile-pic",
	method: "get",
	tags: ["Profiles"],
	summary: "Fetch profile picture for a user by email",
	description:
		"Returns the profile picture URL for the user with the given email address. The profile_pic field is null when no picture has been set.",
	security: [{ [bearerAuth.name]: [] }, {}],
	parameterExamples: {
		email: {
			"with-profile-pic": {
				summary: "User with avatar",
				description: "Returns profile_pic URL.",
				value: "user@example.com",
			},
			"no-profile-pic": {
				summary: "User without avatar",
				description: "Returns profile_pic: null.",
				value: "another@example.com",
			},
			"no-match": {
				summary: "Nonexistent email",
				description: "Returns empty array.",
				value: "nobody@example.com",
			},
		},
	},
	responseExamples: {
		"with-profile-pic": {
			summary: "User has a profile picture",
			description:
				"Send `?email=user@example.com` where the user has an uploaded avatar.",
			value: {
				data: [
					{
						profile_pic:
							"https://example.com/storage/v1/object/public/avatars/user-123.jpg",
					},
				],
				error: null,
			} as const,
		},
		"no-profile-pic": {
			summary: "User has no profile picture",
			description:
				"Send `?email=user@example.com` where the user has no avatar — `profile_pic` is null.",
			value: {
				data: [
					{
						profile_pic: null,
					},
				],
				error: null,
			} as const,
		},
		"no-match": {
			summary: "No user found for email",
			description:
				"Send `?email=nobody@example.com` — returns empty array when no profile matches.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "Missing or invalid email query parameter" },
	},
	response400Examples: {
		"missing-email": {
			summary: "Missing email parameter",
			description: "Omit the `email` query parameter entirely — returns 400.",
			value: {
				data: null,
				error: "email: Required",
			} as const,
		},
	},
} satisfies EndpointSupplement;
