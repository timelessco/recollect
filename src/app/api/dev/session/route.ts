import { NextResponse } from "next/server";

import { createApiClient, getApiUser } from "@/lib/supabase/api";

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
export async function GET() {
	// Block in production - return 404 as if endpoint doesn't exist
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { supabase, token } = await createApiClient();
	const {
		data: { user },
	} = await getApiUser(supabase, token);

	if (!user) {
		return NextResponse.json(
			{ error: "Not authenticated - visit localhost:3000 and log in first" },
			{ status: 401 },
		);
	}

	// Get session for access token
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return NextResponse.json(
			{ error: "No active session found" },
			{ status: 401 },
		);
	}

	return NextResponse.json({
		access_token: session.access_token,
		expires_at: session.expires_at,
		user_email: user.email,
	});
}
