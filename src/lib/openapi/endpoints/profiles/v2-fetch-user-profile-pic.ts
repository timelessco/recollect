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
	responseExamples: {
		"with-profile-pic": {
			summary: "User has a profile picture",
			description: "Returns the profile picture URL for the matched user.",
			value: {
				data: [
					{
						profile_pic:
							"https://example.com/storage/v1/object/public/avatars/user-123.jpg",
					},
				],
				error: null,
			},
		},
		"no-profile-pic": {
			summary: "User has no profile picture",
			description:
				"Returns null for profile_pic when the user has not uploaded a picture.",
			value: {
				data: [
					{
						profile_pic: null,
					},
				],
				error: null,
			},
		},
		"no-match": {
			summary: "No user found for email",
			description:
				"Returns an empty array when no profile matches the queried email address.",
			value: {
				data: [],
				error: null,
			},
		},
	},
	additionalResponses: {
		400: { description: "Missing or invalid email query parameter" },
	},
	response400Examples: {
		"missing-email": {
			summary: "Missing email parameter",
			description:
				"Returned when the required email query parameter is absent.",
			value: {
				data: null,
				error: "email: Required",
			},
		},
	},
} satisfies EndpointSupplement;
