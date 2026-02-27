/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const v2GetGeminiApiKeySupplement = {
	path: "/v2/get-gemini-api-key",
	method: "get",
	tags: ["API Key"],
	summary: "Retrieve decrypted Gemini API key",
	description:
		"Fetches and decrypts the Gemini API key stored in the authenticated user's profile. Returns 404 when no key has been saved.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"api-key-found": {
			summary: "API key retrieved",
			description: "The stored key was decrypted and returned as plaintext.",
			value: {
				data: { apiKey: "AIzaSyAbc123ExampleKeyXYZ" },
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		404: { description: "No Gemini API key is stored for this user" },
	},
} satisfies EndpointSupplement;
