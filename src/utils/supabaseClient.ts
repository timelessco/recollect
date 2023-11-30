import { isProductionEnvironment } from "./supabaseServerClient";

export const supabaseUrl = isProductionEnvironment
	? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL
	: process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = isProductionEnvironment
	? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
