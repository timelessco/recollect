"use client";

import * as React from "react";

import {
	Button,
	buttonBaseClasses,
	ButtonDefaultPendingComp,
} from "@/components/ui/recollect/button";
import { Link, LinkHint } from "@/components/ui/recollect/link";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { GoogleIcon } from "@/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { cn } from "@/utils/tailwind-merge";
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

	const [isPending, startTransition] = React.useTransition();
	const extendedIsPending = usePendingWithMinDuration(isPending, 500);

	const handleSocialLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const redirectTo = `${window.location.origin}/auth/oauth?next=${callbackURL ?? `/${EVERYTHING_URL}`}`;

		startTransition(async () => {
			try {
				const supabase = createClient();
				const { error } = await supabase.auth.signInWithOAuth({
					provider: "google",
					options: { redirectTo },
				});

				if (error) {
					handleClientError(error, "Failed to sign in with Google");
					return;
				}

				successToast("Proceeding with Google OAuth!");
			} catch (error) {
				handleClientError(error, "Failed to sign in with Google");
			}
		});
	};

	return (
		<form onSubmit={handleSocialLogin} className="w-full">
			<Button
				type="submit"
				className="w-full gap-2 rounded-lg bg-gray-950 p-2 text-13 leading-[15px] font-medium text-gray-0 shadow-custom-2 hover:not-data-disabled:bg-gray-700"
				pending={extendedIsPending}
				pendingSlot={
					<ButtonDefaultPendingComp>
						<span>Logging in...</span>
					</ButtonDefaultPendingComp>
				}
			>
				<GoogleIcon className="mr-1.5" />

				<span>Continue with Google</span>
			</Button>
		</form>
	);
}

export function ContinueWithEmailLink() {
	return (
		<Link
			className={cn(
				buttonBaseClasses,
				"w-full bg-gray-alpha-100 text-gray-950",
				"gap-2 rounded-lg p-2 text-13 leading-[15px] font-medium",
				"no-underline hover:not-data-disabled:bg-gray-300",
			)}
			href="/email"
		>
			<div className="relative flex items-center justify-center">
				<span className="text-center">Continue with Email</span>
				<div className="absolute -right-4">
					<LinkHint />
				</div>
			</div>
		</Link>
	);
}
