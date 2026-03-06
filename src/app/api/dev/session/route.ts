import { DevSessionInputSchema, DevSessionOutputSchema } from "./schema";
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiWarn } from "@/lib/api-helpers/response";

const ROUTE = "dev/session";

/**
 * Dev-only endpoint to retrieve current session token for API testing.
 * Returns 404 in production for security.
 *
 * IMPORTANT: Must be accessed via BROWSER (not curl/CLI) because
 * session cookies are browser-only.
 *
 * Usage:
 * 1. Visit http://localhost:3000/api/dev/session in browser
 * 2. Copy the `access_token` from the JSON response
 * 3. Use in CLI: curl -H "Authorization: Bearer <token>" ...
 * @returns {object} { access_token, expires_at, user_email }
 */
export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: DevSessionInputSchema,
	outputSchema: DevSessionOutputSchema,
	handler: async ({ supabase, user, route }) => {
		if (
			process.env.NODE_ENV !== "development" ||
			process.env.VERCEL_ENV === "production"
		) {
			return apiWarn({ route, message: "Not found", status: 404 });
		}

		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			return apiWarn({
				route,
				message: "No active session found",
				status: 401,
			});
		}

		return {
			access_token: session.access_token,
			expires_at: session.expires_at,
			user_email: user.email,
		};
	},
});
