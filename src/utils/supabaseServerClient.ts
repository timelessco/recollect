import { type NextApiRequest, type NextApiResponse } from "next";
import {
	createServerClient,
	serialize,
	type CookieOptions,
} from "@supabase/ssr";

export const isProductionEnvironment = process.env.NODE_ENV === "production";

// in case the user did not add the supabase dev keys in env file then even in dev mode the app will point out to the prod keys mentioned in the env file
// the below ternary conditions handel this logic
const developmentSupbaseUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	: process.env.NEXT_PUBLIC_SUPABASE_URL;

const developmentSupabaseAnonKey = process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseAnonKey = !isProductionEnvironment
	? developmentSupabaseAnonKey
	: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const apiSupabaseClient = (
	request: NextApiRequest,
	response: NextApiResponse & {
		appendHeader: (name: unknown, function_: unknown) => void;
	},
) => {
	const supabase = createServerClient(
		isProductionEnvironment
			? process.env.NEXT_PUBLIC_SUPABASE_URL
			: developmentSupbaseUrl,
		supabaseAnonKey,
		{
			cookies: {
				get(name: string) {
					return request.cookies[name];
				},
				set(name: string, value: string, options: CookieOptions) {
					response.appendHeader("Set-Cookie", serialize(name, value, options));
				},
				remove(name: string, options: CookieOptions) {
					response.appendHeader("Set-Cookie", serialize(name, "", options));
				},
			},
			// cookieOptions: {
			// 	name: "no-cookie-for-you",
			// },
		},
	);

	return supabase;
};
