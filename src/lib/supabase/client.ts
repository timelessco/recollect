import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";
import { type Database } from "@/types/database.types";

export function createClient() {
	return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
