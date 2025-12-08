"use client";

import * as React from "react";
import { useLinkStatus } from "next/link";
import { ProgressBar } from "react-aria-components";

import { button } from "../ui/recollect/button";
import { Link } from "../ui/recollect/link";
import { Spinner } from "../ui/recollect/spinner";

import { Button } from "@/components/ui/recollect/button";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { GoogleIcon } from "@/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL } from "@/utils/constants";
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

	const [isPending, startTransition] = React.useTransition();
	const extendedIsPending = usePendingWithMinDuration(isPending, 500);

	const handleSocialLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		startTransition(async () => {
			try {
				const supabase = createClient();
				const { error } = await supabase.auth.signInWithOAuth({
					provider: "google",
					options: {
						redirectTo: `${window.location.origin}/auth/oauth?next=${callbackURL ? `${callbackURL}` : `/${EVERYTHING_URL}`}`,
					},
				});

				if (error) {
					throw error;
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
				className="w-full"
				isPending={extendedIsPending}
				isDisabled={extendedIsPending}
				PendingSlot={GoogleButtonPendingSlot}
			>
				<GoogleIcon className="mr-1.5" />

				<span>Continue with Google</span>
			</Button>
		</form>
	);
}

function GoogleButtonPendingSlot() {
	return (
		<ProgressBar isIndeterminate aria-label="Logging in...">
			<Spinner className="mr-2 text-xs" />
			<span>Logging in...</span>
		</ProgressBar>
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
			Continue with Email <LinkHint />
		</Link>
	);
}

function LinkHint() {
	const { pending } = useLinkStatus();
	return (
		<span aria-hidden className={`link-hint ${pending ? "is-pending" : ""}`} />
	);
}
