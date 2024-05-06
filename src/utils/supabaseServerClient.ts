import { type NextApiRequest, type NextApiResponse } from "next";
import {
	createServerClient,
	serialize,
	type CookieOptions,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";

export const isProductionEnvironment = process.env.NODE_ENV === "production";

// in case the user did not add the supabase dev keys in env file then even in dev mode the app will point out to the prod keys mentioned in the env file
// the below ternary conditions handel this logic
const developmentSupbaseUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	? process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
	: process.env.NEXT_PUBLIC_SUPABASE_URL;

const developmentSupabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_KEY
	? process.env.DEV_SUPABASE_SERVICE_KEY
	: process.env.SUPABASE_SERVICE_KEY;

const developmentSupabaseSecretKey = process.env.DEV_SUPABASE_JWT_SECRET_KEY
	? process.env.DEV_SUPABASE_JWT_SECRET_KEY
	: process.env.SUPABASE_JWT_SECRET_KEY;

// export const apiSupabaseClient = () => {
// 	const supabase = createClient(
// 		isProductionEnvironment
// 			? process.env.NEXT_PUBLIC_SUPABASE_URL
// 			: developmentSupbaseUrl,
// 		isProductionEnvironment
// 			? process.env.SUPABASE_SERVICE_KEY
// 			: developmentSupabaseServiceKey,
// 	);

// 	return supabase;
// };

// export const verifyAuthToken = (accessToken: string) =>
// 	// we are disabling as we dont care if it gives a void
// 	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
// 	verify(
// 		accessToken,
// 		isProductionEnvironment
// 			? process.env.SUPABASE_JWT_SECRET_KEY
// 			: developmentSupabaseSecretKey,
// 		(error, decoded) => ({ error, decoded }),
// 	) as unknown as {
// 		decoded: { email: string; sub: string };
// 		error: VerifyErrors | null;
// 	};

export const apiSupabaseClient = (
	request: NextApiRequest,
	response: NextApiResponse,
) => {
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_DEV_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY as string,
		{
			cookies: {
				get(name: string) {
					return request.cookies[name];
				},
				set(name: string, value: string, options: CookieOptions) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
					response.appendHeader("Set-Cookie", serialize(name, value, options));
				},
				remove(name: string, options: CookieOptions) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-expect-error
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
