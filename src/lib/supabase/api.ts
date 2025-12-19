import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { type SupabaseClient, type User } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";
import { type Database } from "@/types/database.types";

/**
 * Creates a Supabase client for App Router API routes with support for:
 * - Cookie-based authentication (standard web auth)
 * - Authorization header authentication (mobile apps)
 *
 * This enables RLS (Row Level Security) policies to work correctly
 * when mobile apps pass authentication via Bearer tokens.
 * @returns Object containing the Supabase client and extracted token
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { supabase, token } = await createApiClient();
 *   const { data: { user } } = await getApiUser(supabase, token);
 * }
 * ```
 */
export async function createApiClient() {
	// Get authorization header for mobile app authentication
	const headersList = await headers();
	const cookieStore = await cookies();
	const authorization = headersList.get("authorization");

	// Strip "Bearer " prefix from token for use with getUser()
	const token = authorization?.replace("Bearer ", "") ?? null;

	const supabase = createServerClient<Database>(
		SUPABASE_URL,
		SUPABASE_ANON_KEY,
		{
			// This is for Recollect Mobile - Auth context from mobile app is passed to the server via Authorization header
			// Fix for - https://supabase.com/docs/guides/functions/auth#:~:text=Row%20Level%20Security%23,Security%20will%20be%20enforced.
			...(authorization
				? {
						global: { headers: { Authorization: authorization } },
					}
				: {}),
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					// For API routes, we typically don't set cookies
					// But this is required by the Supabase client interface
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					} catch (error) {
						// The `setAll` method was called from a Server Component.
						// This can be ignored if you have middleware refreshing
						// user sessions.
						if (process.env.NODE_ENV === "development") {
							console.warn(
								"[createApiClient] Cookie setAll failed (expected in RSC):",
								error,
							);
						}
					}
				},
			},
		},
	);

	return { supabase, token };
}

/**
 * Gets the authenticated user from Supabase.
 * Supports both token-based (mobile) and cookie-based (web) authentication.
 *
 * Per Supabase documentation, getUser() requires the token to be explicitly passed
 * as a parameter when using Bearer token authentication (mobile apps).
 * The Authorization header in global.headers is only used for RLS enforcement.
 * @param supabase - The Supabase client instance
 * @param token - Optional JWT token (stripped of "Bearer " prefix)
 * @returns User data from Supabase auth
 * @example
 * ```typescript
 * const { supabase, token } = await createApiClient();
 * const { data: { user }, error } = await getApiUser(supabase, token);
 * ```
 */
export async function getApiUser(
	supabase: SupabaseClient<Database>,
	token?: string | null,
) {
	if (token) {
		// Mobile app: Use token-based auth by explicitly passing the JWT
		return await supabase.auth.getUser(token);
	}

	// Web app: Use cookie-based auth
	return await supabase.auth.getUser();
}

// Error response shape - matches ApiErrorResponse from api-response.ts
type AuthErrorResponse = { data: null; error: string };

/**
 * Result type for requireAuth - discriminated union for type narrowing
 */
export type AuthResult =
	| { supabase: SupabaseClient<Database>; user: User; errorResponse: null }
	| {
			supabase: null;
			user: null;
			errorResponse: NextResponse<AuthErrorResponse>;
	  };

/**
 * Authenticates API request and returns Supabase client + user.
 * Returns error response if auth fails.
 * @param routeName - Route identifier for logging (e.g., "set-bookmark-categories")
 * @returns Auth context or error response
 * @example
 * const auth = await requireAuth("my-endpoint");
 * if (auth.errorResponse) return auth.errorResponse;
 * const { supabase, user } = auth;
 */
export async function requireAuth(routeName: string): Promise<AuthResult> {
	const { supabase, token } = await createApiClient();
	const {
		data: { user },
		error: userError,
	} = await getApiUser(supabase, token);

	if (userError) {
		console.warn(`[${routeName}] Auth error:`, userError);
		return {
			supabase: null,
			user: null,
			errorResponse: NextResponse.json(
				{ data: null, error: userError.message },
				{ status: 400 },
			),
		};
	}

	if (!user) {
		console.warn(`[${routeName}] No user found in session`);
		return {
			supabase: null,
			user: null,
			errorResponse: NextResponse.json(
				{ data: null, error: "Not authenticated" },
				{ status: 401 },
			),
		};
	}

	return { supabase, user, errorResponse: null };
}
