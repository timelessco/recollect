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
			description: "The user has configured a Gemini API key in their profile.",
			value: {
				data: { hasApiKey: true },
				error: null,
			},
		},
		"no-api-key": {
			summary: "User has no Gemini API key",
			description:
				"The user has not configured a Gemini API key. AI features will be unavailable.",
			value: {
				data: { hasApiKey: false },
				error: null,
			},
		},
	},
} satisfies EndpointSupplement;
