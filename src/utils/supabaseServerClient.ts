import { createClient } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";

export const isProductionEnvironment = process.env.NODE_ENV === "production";

export const apiSupabaseClient = () => {
	const supabase = createClient(
		isProductionEnvironment
			? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL
			: process.env.NEXT_PUBLIC_SUPABASE_URL,
		isProductionEnvironment
			? process.env.PROD_SUPABASE_SERVICE_KEY
			: process.env.SUPABASE_SERVICE_KEY,
	);

	return supabase;
};

export const verifyAuthToken = (accessToken: string) =>
	// we are disabling as we dont care if it gives a void
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	verify(
		accessToken,
		isProductionEnvironment
			? process.env.PROD_SUPABASE_JWT_SECRET_KEY
			: process.env.SUPABASE_JWT_SECRET_KEY,
		(error, decoded) => ({ error, decoded }),
	) as unknown as {
		decoded: { email: string; sub: string };
		error: VerifyErrors | null;
	};
