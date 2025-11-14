const DEV_SUPABASE_URL = process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	: process.env.NEXT_PUBLIC_SUPABASE_URL;

const DEV_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_URL =
	process.env.NODE_ENV === "development"
		? DEV_SUPABASE_URL
		: process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
	process.env.NODE_ENV === "development"
		? DEV_SUPABASE_ANON_KEY
		: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
