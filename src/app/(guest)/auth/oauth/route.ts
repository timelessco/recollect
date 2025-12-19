import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

// The client you created from the Server-Side Auth instructions
import { createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/utils/error-utils/error-message";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const code = searchParams.get("code");
		// if "next" is in param, use it as the redirect URL
		const _next = searchParams.get("next");
		const next = _next?.startsWith("/") ? _next : "/";

		if (code) {
			const supabase = await createServerClient();
			const { error } = await supabase.auth.exchangeCodeForSession(code);

			if (!error) {
				redirect(next);
			} else {
				redirect(`/auth/error?error=${getErrorMessage(error)}`);
			}
		}

		// redirect the user to an error page with some instructions
		redirect(`/auth/error?error=No code`);
	} catch (error) {
		console.error("Error in oauth route:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "exchange_code_for_session",
			},
			extra: {
				url: request.url,
			},
		});
		redirect(`/auth/error?error=An unexpected error occurred`);
	}
}
