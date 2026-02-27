/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const v2ApiKeySupplement = {
	path: "/v2/api-key",
	method: "put",
	tags: ["API Key"],
	summary: "Save Gemini API key",
	description:
		"Validates the provided Gemini API key against the Google AI API, encrypts it with AES, and upserts it to the authenticated user's profile. Returns a 400 if the key fails validation.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"save-api-key": {
			summary: "Save a valid Gemini API key",
			description:
				"Provide a valid Gemini API key. The server validates it via a test generation call before storing.",
			value: {
				apikey: "AIzaSyAbc123ExampleKeyXYZ",
			} as const,
		},
	},
	responseExamples: {
		"api-key-saved": {
			summary: "API key saved",
			description:
				"The Gemini API key was validated and encrypted successfully.",
			value: {
				data: { success: true },
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"invalid-api-key": {
			summary: "Invalid API key",
			description:
				"The provided API key failed validation against the Google AI API.",
			value: {
				data: null,
				error: "Invalid API key",
			} as const,
		},
	},
	additionalResponses: {
		400: {
			description:
				"Validation failed — API key is invalid or rejected by Google AI",
		},
	},
} satisfies EndpointSupplement;
