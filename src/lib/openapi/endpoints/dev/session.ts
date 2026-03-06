/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const devSessionSupplement = {
	path: "/dev/session",
	method: "get",
	tags: ["Dev"],
	summary: "Retrieve current session token for API testing",
	description:
		"Dev-only endpoint that returns the current Supabase session token. Must be accessed via browser (relies on session cookies). Returns 404 in production.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExample: {
		data: {
			access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
			expires_at: 1719878400,
			user_email: "user@example.com",
		},
		error: null,
	},
	additionalResponses: {
		404: { description: "Endpoint disabled in production" },
	},
} satisfies EndpointSupplement;
