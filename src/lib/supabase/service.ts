import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./constants";
import { type Database } from "@/types/database.types";

/**
 * Creates a Supabase server client with SERVICE KEY.
 * This bypasses RLS - use only for server-side operations where
 * RLS would otherwise block access (e.g., storage operations in local dev).
 *
 * WARNING: Never expose this client to the browser.
 */
export const createServerServiceClient = async () => {
	const cookieStore = await cookies();

	return createSupabaseServerClient<Database>(
		SUPABASE_URL,
		SUPABASE_SERVICE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					} catch {
						// Can be ignored if middleware refreshes sessions
					}
				},
			},
		},
	);
};
