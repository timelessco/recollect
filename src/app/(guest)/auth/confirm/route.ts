import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/utils/error-utils/error-message";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const token_hash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	// if "next" is in param, use it as the redirect URL
	const _next = searchParams.get("next");
	const next = _next?.startsWith("/") ? _next : "/";

	if (token_hash && type) {
		const supabase = await createClient();
		const { error } = await supabase.auth.verifyOtp({
			type,
			token_hash,
		});

		if (!error) {
			// original origin before load balancer
			const forwardedHost = request.headers.get("x-forwarded-host");
			if (forwardedHost) {
				return redirect(`https://${forwardedHost}${next}`);
			} else {
				return redirect(next);
			}
		} else {
			// redirect the user to an error page with some instructions
			redirect(`/auth/error?error=${getErrorMessage(error)}`);
		}
	}

	// redirect the user to an error page with some instructions
	redirect(`/auth/error?error=No token hash or type`);
}
