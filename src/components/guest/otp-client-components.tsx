"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Form } from "@base-ui/react/form";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

import { Button } from "@/components/ui/recollect/button";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
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

	const verifyOtp = (otpValue: string) => {
		if (isPending) {
			return;
		}

		startTransition(async () => {
			try {
				const supabase = createClient();

				const { error } = await supabase.auth.verifyOtp({
					email,
					token: otpValue,
					type: "email",
				});

				if (error) {
					handleClientError(error, "Failed to verify OTP");
					return;
				}

				// Navigate immediately after success - same transition!
				router.push(`/${EVERYTHING_URL}`);
			} catch (error) {
				handleClientError(error, "Failed to verify OTP");
			}
		});
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		verifyOtp(otp);
	};

	return (
		<Form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
			<div className="flex flex-col gap-1">
				<OTPInput
					name="otp"
					maxLength={6}
					value={otp}
					onChange={setOtp}
					onComplete={verifyOtp}
					pattern={REGEXP_ONLY_DIGITS}
					autoFocus
					inputMode="numeric"
					containerClassName="group flex items-center justify-center gap-3"
					render={({ slots }) => (
						<>
							{slots.map((slot, idx) => (
								// Slots are stable and position-based, so index is appropriate here
								// eslint-disable-next-line react/no-array-index-key
								<Slot key={idx} {...slot} />
							))}
						</>
					)}
				/>
			</div>

			<Button
				type="submit"
				className="gap-2 rounded-lg bg-gray-950 p-2 text-13 leading-[15px] font-medium text-gray-0 shadow-custom-2 hover:not-data-disabled:bg-gray-700"
				pending={extendedIsPending}
				disabled={extendedIsPending || otp.length !== 6}
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
				"relative h-10 w-18",
				"flex items-center justify-center",
				"bg-gray-alpha-100",
				"text-sm font-medium text-gray-900",
				"rounded-lg",
				"transition",
				props.isActive && "ring-2 ring-blue-500 outline-none",
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
