/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteApiKeySupplement = {
	path: "/v2/delete-api-key",
	method: "delete",
	tags: ["API Key"],
	summary: "Delete Gemini API key",
	description:
		"Nullifies the Gemini API key stored in the authenticated user's profile. The operation is idempotent — calling it when no key is stored still returns success.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"api-key-deleted": {
			summary: "API key deleted",
			description:
				"The Gemini API key was removed from the user's profile. Also succeeds when no key was previously stored.",
			value: {
				data: { success: true },
				error: null,
			} as const,
		},
	},
} satisfies EndpointSupplement;
