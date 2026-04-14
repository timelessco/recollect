"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Form } from "@base-ui/react/form";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";

import type { SlotProps } from "input-otp";

import { Button } from "@/components/ui/recollect/button";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { useResolvePostLoginRedirect } from "@/lib/auth/use-resolve-post-login-redirect";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { cn } from "@/utils/tailwind-merge";

interface VerifyOtpFormProps {
  email: string;
}

export function VerifyOtpForm(props: VerifyOtpFormProps) {
  const { email } = props;
  const [otp, setOtp] = React.useState("");
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const extendedIsPending = usePendingWithMinDuration(isPending);
  const resolvePostLoginRedirect = useResolvePostLoginRedirect();

  const verifyOtp = (otpValue: string) => {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otpValue,
          type: "email",
        });

        if (error) {
          handleClientError(error, "Failed to verify OTP");
          return;
        }

        // verifyOtp runs client-side, so the App Router /auth/confirm
        // callback is bypassed for in-app code entry. Route through the
        // shared helper so first-timers still land on /discover where the
        // welcome modal mounts.
        const fallback = `/${EVERYTHING_URL}`;
        const destination = data.user
          ? await resolvePostLoginRedirect(supabase, data.user.id, fallback)
          : fallback;

        router.push(destination);
      } catch (error) {
        handleClientError(error, "Failed to verify OTP");
      }
    });
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    verifyOtp(otp);
  };

  return (
    <Form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <OTPInput
          autoFocus
          containerClassName="group flex items-center justify-center gap-3"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          onChange={setOtp}
          onComplete={verifyOtp}
          pattern={REGEXP_ONLY_DIGITS}
          render={({ slots }) => (
            <>
              {slots.map((slot, idx) => (
                // Slots are stable and position-based, so index is appropriate here
                // oxlint-disable-next-line react/no-array-index-key
                <Slot key={idx} {...slot} />
              ))}
            </>
          )}
          value={otp}
        />
      </div>

      <Button
        className="gap-2 rounded-xl bg-gray-950 px-2 py-[10px] text-sm leading-[115%] font-medium text-gray-0 shadow-custom-2 hover:not-data-disabled:bg-gray-700"
        disabled={extendedIsPending || otp.length !== 6}
        pending={extendedIsPending}
        type="submit"
      >
        Verify Email
      </Button>
    </Form>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "relative h-9 w-[39px]",
        "flex items-center justify-center",
        "bg-gray-50",
        "text-sm leading-[115%] font-medium text-gray-800",
        "rounded-[10px]",
        "transition",
        "border border-gray-300",
        props.isActive && "ring-2 ring-gray-200 outline-1 outline-gray-300",
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && <FakeCaret />}
    </div>
  );
}

function FakeCaret() {
  return (
    <div className="pointer-events-none absolute inset-0 flex animate-caret-blink items-center justify-center">
      <div className="h-8 w-px bg-gray-900" />
    </div>
  );
}
