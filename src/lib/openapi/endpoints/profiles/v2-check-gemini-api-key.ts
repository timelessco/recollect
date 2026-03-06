/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const v2CheckGeminiApiKeySupplement = {
	path: "/v2/check-gemini-api-key",
	method: "get",
	tags: ["Profiles"],
	summary: "Check if user has a Gemini API key configured",
	description:
		"Returns whether the authenticated user has a Gemini API key stored in their profile. Used to conditionally enable AI-powered features in the UI.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"has-api-key": {
			summary: "User has a Gemini API key",
			description:
				"No parameters needed — authenticate as a user with a Gemini API key configured. Returns `true`.",
			value: {
				data: { hasApiKey: true },
				error: null,
			} as const,
		},
		"no-api-key": {
			summary: "User has no Gemini API key",
			description:
				"No parameters needed — authenticate as a user without a Gemini API key. Returns `false`.",
			value: {
				data: { hasApiKey: false },
				error: null,
			} as const,
		},
	},
} satisfies EndpointSupplement;
