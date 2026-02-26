/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2ProviderSupplement = {
	path: "/v2/user/get/provider",
	method: "get",
	tags: ["User"],
	summary: "Look up OAuth provider by email",
	description:
		"Returns the OAuth provider (e.g. google, email) for a given email address. No authentication required. Returns null if the email has no provider or does not exist.",
	security: [],
	parameterExamples: {
		email: {
			"google-user": {
				summary: "Google OAuth user",
				description: "Returns provider: google.",
				value: "user@example.com",
			},
			"email-user": {
				summary: "Email/password user",
				description: "Returns provider: email.",
				value: "another@example.com",
			},
			"no-provider": {
				summary: "Unknown email",
				description: "Returns provider: null.",
				value: "nobody@example.com",
			},
			"invalid-email": {
				summary: "Invalid email format",
				description: "Returns 400 validation error.",
				value: "not-an-email",
			},
		},
	},
	responseExamples: {
		"google-provider": {
			summary: "Google OAuth user",
			description:
				"Send `?email=user@example.com` where the user signed up with Google OAuth.",
			value: {
				data: { provider: "google" },
				error: null,
			} as const,
		},
		"email-provider": {
			summary: "Email/password user",
			description:
				"Send `?email=user@example.com` where the user signed up with email/password.",
			value: {
				data: { provider: "email" },
				error: null,
			} as const,
		},
		"no-provider": {
			summary: "Unknown or nonexistent email",
			description:
				"Send `?email=nobody@example.com` — email doesn't exist or has no provider.",
			value: {
				data: { provider: null },
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"invalid-email": {
			summary: "Invalid or missing email",
			description:
				"Omit the `email` parameter or send an invalid value — returns 400.",
			value: {
				data: null,
				error: "Invalid email",
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "Invalid or missing email query parameter" },
	},
} satisfies EndpointSupplement;
