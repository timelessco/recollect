"use client";

import * as React from "react";

import {
  Button,
  buttonBaseClasses,
  ButtonDefaultPendingComp,
} from "@/components/ui/recollect/button";
import { Link, LinkHint } from "@/components/ui/recollect/link";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { AppleIcon } from "@/icons/apple-icon";
import { GoogleIcon } from "@/icons/google-icon";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { cn } from "@/utils/tailwind-merge";

export function SignInWithGoogleForm() {
  // oxlint-disable-next-line react/hook-use-state -- read-once value, setter intentionally unused
  const [callbackURL] = React.useState<string | undefined>(() =>
    "window" in globalThis
      ? (new URLSearchParams(globalThis.location.search).get("next") ?? undefined)
      : undefined,
  );

  const [isPending, startTransition] = React.useTransition();
  const extendedIsPending = usePendingWithMinDuration(isPending, 500);

  const handleSocialLogin = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const redirectTo = `${window.location.origin}/auth/oauth?next=${
      callbackURL ?? `/${EVERYTHING_URL}`
    }`;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
          options: { redirectTo },
          provider: "google",
        });

        if (error) {
          handleClientError(error, "Failed to sign in with Google");
        }
      } catch (error) {
        handleClientError(error, "Failed to sign in with Google");
      }
    });
  };

  return (
    <form className="w-full" onSubmit={handleSocialLogin}>
      <Button
        aria-label="Sign in with Google"
        className="w-full rounded-[10px] bg-gray-alpha-100 py-2 text-13 leading-[13px] font-medium text-gray-800 hover:not-data-disabled:bg-gray-300"
        pending={extendedIsPending}
        pendingSlot={
          <ButtonDefaultPendingComp>
            <span className="py-[3.5px]">Logging in...</span>
          </ButtonDefaultPendingComp>
        }
        type="submit"
      >
        <GoogleIcon className="size-5.5" />
      </Button>
    </form>
  );
}

export function SignInWithAppleForm() {
  // oxlint-disable-next-line react/hook-use-state -- read-once value, setter intentionally unused
  const [callbackURL] = React.useState<string | undefined>(() =>
    "window" in globalThis
      ? (new URLSearchParams(globalThis.location.search).get("next") ?? undefined)
      : undefined,
  );

  const [isPending, startTransition] = React.useTransition();
  const extendedIsPending = usePendingWithMinDuration(isPending, 500);

  const handleSocialLogin = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const redirectTo = `${window.location.origin}/auth/oauth?next=${
      callbackURL ?? `/${EVERYTHING_URL}`
    }`;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
          options: { redirectTo },
          provider: "apple",
        });

        if (error) {
          handleClientError(error, "Failed to sign in with Apple");
        }
      } catch (error) {
        handleClientError(error, "Failed to sign in with Apple");
      }
    });
  };

  return (
    <form className="w-full" onSubmit={handleSocialLogin}>
      <Button
        aria-label="Sign in with Apple"
        className="w-full rounded-[10px] bg-gray-alpha-100 py-2 text-13 leading-[13px] font-medium text-gray-800 hover:not-data-disabled:bg-gray-300"
        pending={extendedIsPending}
        pendingSlot={
          <ButtonDefaultPendingComp>
            <span className="py-[3.5px]">Logging in...</span>
          </ButtonDefaultPendingComp>
        }
        type="submit"
      >
        <AppleIcon className="size-5.5" />
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
        "gap-2 rounded-[10px] px-2 py-2.5 text-sm leading-[115%] font-medium",
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
