import { createBrowserClient } from "@supabase/ssr";

import { isProductionEnvironment } from "./supabaseServerClient";

// in case the user did not add the supabase dev keys in env file then even in dev mode the app will point out to the prod keys mentioned in the env file
// the below ternary conditions handel this logic
const developmentSupabaseUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	: process.env.NEXT_PUBLIC_SUPABASE_URL;

const developmentSupabaseAnonKey = process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseUrl = !isProductionEnvironment
	? developmentSupabaseUrl
	: process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = !isProductionEnvironment
	? developmentSupabaseAnonKey
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
	const supabase = createBrowserClient(
		process.env.NEXT_PUBLIC_DEV_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY as string,
	);

	return supabase;
};
