import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";
import { type Database } from "@/types/database.types";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createServerClient() {
	const cookieStore = await cookies();

	return createSupabaseServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch (error) {
					// Expected when called from Server Component with middleware refreshing sessions
					if (process.env.NODE_ENV === "development") {
						console.warn(
							"[createServerClient] Cookie setAll failed (expected in RSC):",
							error,
						);
					}
				}
			},
		},
	});
}
