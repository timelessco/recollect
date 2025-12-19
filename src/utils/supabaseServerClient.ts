import { type NextApiRequest, type NextApiResponse } from "next";
import {
	createServerClient,
	serialize,
	type CookieOptions,
} from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

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
	response: NextApiResponse,
) => {
	const apiCookieResponse = response as NextApiResponse & {
		appendHeader: (name: unknown, function_: unknown) => void;
	};

	const authorization = request?.headers?.authorization;

	const supabase = createServerClient(
		isProductionEnvironment
			? process.env.NEXT_PUBLIC_SUPABASE_URL
			: developmentSupbaseUrl,
		supabaseAnonKey,
		{
			// This is for Recollect Mobile - Auth context from mobile app is passed to the server via Authorization header
			// Fix for - https://supabase.com/docs/guides/functions/auth#:~:text=Row%20Level%20Security%23,Security%20will%20be%20enforced.
			...(authorization
				? {
						global: { headers: { Authorization: authorization } },
					}
				: {}),
			cookies: {
				get(name: string) {
					return request.cookies[name];
				},
				set(name: string, value: string, options: CookieOptions) {
					apiCookieResponse.appendHeader(
						"Set-Cookie",
						serialize(name, value, options),
					);
				},
				remove(name: string, options: CookieOptions) {
					apiCookieResponse.appendHeader(
						"Set-Cookie",
						serialize(name, "", options),
					);
				},
			},
		},
	);

	return supabase;
};

export const getApiSupabaseUser = async (
	request: NextApiRequest,
	supabase: SupabaseClient,
) => {
	const authorization = request.headers.authorization;
	const token = authorization?.replace("Bearer ", "");

	if (!token) {
		return await supabase.auth.getUser();
	}

	return await supabase.auth.getUser(token);
};
