"use client";

import * as React from "react";

import { LoadingButton } from "@/components/ui/recollect/button";
import GoogleIcon from "@/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { ALL_BOOKMARKS_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { successToast } from "@/utils/toastMessages";

export function SignInWithGoogleForm() {
	const [isLoading, setIsLoading] = React.useState(false);

	const [callbackURL] = React.useState<string | undefined>(() => {
		if ("window" in globalThis) {
			const urlParams = new URLSearchParams(globalThis.location.search);
			const redirect = urlParams.get("redirect");

			return redirect ?? undefined;
		}

		return undefined;
	});

	const handleSocialLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		setIsLoading(true);

		try {
			const supabase = createClient();
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}/auth/oauth?next=${callbackURL ? `${callbackURL}` : `/${ALL_BOOKMARKS_URL}`}`,
				},
			});

			if (error) {
				throw error;
			}

			successToast("Proceeding with Google OAuth!");
		} catch (error) {
			handleClientError(error, "Failed to sign in with Google");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSocialLogin} className="w-full">
			<LoadingButton
				type="submit"
				className="w-full"
				isLoading={isLoading}
				loadingText="Logging in..."
			>
				<GoogleIcon className="mr-1.5" />

				<span>Continue with Google</span>
			</LoadingButton>
		</form>
	);
}
