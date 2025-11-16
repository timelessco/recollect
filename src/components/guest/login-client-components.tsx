"use client";

import * as React from "react";
import { ProgressBar } from "react-aria-components";

import { button } from "../ui/recollect/button";
import { Link } from "../ui/recollect/link";
import { Spinner } from "../ui/recollect/spinner";

import { Button } from "@/components/ui/recollect/button";
import { GoogleIcon } from "@/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { ALL_BOOKMARKS_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { tv } from "@/utils/tailwind-merge";
import { successToast } from "@/utils/toastMessages";

export function SignInWithGoogleForm() {
	const [callbackURL] = React.useState<string | undefined>(() => {
		if ("window" in globalThis) {
			const urlParams = new URLSearchParams(globalThis.location.search);
			const next = urlParams.get("next");

			return next ?? undefined;
		}

		return undefined;
	});

	const [isPending, setIsPending] = React.useState(false);

	const handleSocialLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		setIsPending(true);

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
			setIsPending(false);
		}
	};

	return (
		<form onSubmit={handleSocialLogin} className="w-full">
			<Button
				type="submit"
				className="w-full"
				isPending={isPending}
				isDisabled={isPending}
				pendingSlot={
					<ProgressBar isIndeterminate aria-label="Logging in...">
						<Spinner className="mr-2 text-xs" />
						<span>Logging in...</span>
					</ProgressBar>
				}
			>
				<GoogleIcon className="mr-1.5" />

				<span>Continue with Google</span>
			</Button>
		</form>
	);
}

const linkStyles = tv({
	extend: button,
	base: "w-full bg-gray-alpha-100 text-gray-950 shadow-none",
	variants: {
		isHovered: {
			true: "bg-gray-300",
		},
	},
});

export function ContinueWithEmailLink() {
	return (
		<Link className={linkStyles} href="/email" asButton>
			Continue with Email
		</Link>
	);
}
