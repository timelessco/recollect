/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2UpdateUsernameSupplement = {
	path: "/v2/profiles/update-username",
	method: "patch",
	tags: ["Profiles"],
	summary: "Update authenticated user's username",
	description:
		"Slugifies the provided username (lowercase, ASCII-safe) and updates it for the authenticated user. Returns 409 Conflict if the username is already taken by another user.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"valid-username": {
			summary: "Valid username",
			description: "A simple username string to be slugified and saved.",
			value: { username: "johndoe" },
		},
		"username-with-spaces": {
			summary: "Username with spaces",
			description:
				"Spaces and special characters are slugified — becomes 'john-doe'.",
			value: { username: "John Doe" },
		},
	},
	responseExamples: {
		"username-updated": {
			summary: "Username updated successfully",
			description: "The new slugified username stored in the profiles table.",
			value: {
				data: [{ user_name: "johndoe" }],
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"missing-username": {
			summary: "Missing username field",
			description: "The request body did not include a username field.",
			value: {
				data: null,
				error: "Invalid request body",
			} as const,
		},
	},
	additionalResponses: {
		409: { description: "Username already taken" },
		401: { description: "Not authenticated" },
	},
} satisfies EndpointSupplement;
