"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Form, Input, TextField } from "react-aria-components";

import { FieldError, inputStyles } from "../ui/recollect/field";

import { Button } from "@/components/ui/recollect/button";
import { createClient } from "@/lib/supabase/client";
import { ALL_BOOKMARKS_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

interface VerifyOtpFormProps {
	email: string;
}

export function VerifyOtpForm(props: VerifyOtpFormProps) {
	const { email } = props;
	const [isPending, setIsPending] = React.useState(false);
	const router = useRouter();

	const handleFormAction = async (formData: FormData) => {
		const otp = formData.get("otp") as string;

		setIsPending(true);

		try {
			const supabase = createClient();

			const { error } = await supabase.auth.verifyOtp({
				email,
				token: otp,
				type: "email",
			});

			if (error) {
				throw error;
			}

			router.push(`/${ALL_BOOKMARKS_URL}`);
		} catch (error) {
			handleClientError(error, "Please enter a valid 6-digit OTP");
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Form action={handleFormAction} className="flex w-full flex-col gap-4">
			<TextField
				type="text"
				name="otp"
				inputMode="numeric"
				autoFocus
				isRequired
				aria-label="OTP"
				pattern="\d*"
				autoComplete="one-time-code"
				validate={validateOtp}
				className="flex flex-col gap-1"
			>
				<Input
					placeholder="Enter 6-digit code"
					className={inputStyles}
					maxLength={6}
				/>
				<FieldError />
			</TextField>

			<Button type="submit" isPending={isPending} isDisabled={isPending}>
				Verify Email
			</Button>
		</Form>
	);
}

function validateOtp(value: string) {
	if (!value) {
		return "OTP is required";
	}

	if (value.length !== 6) {
		return "OTP must be 6 digits";
	}

	if (!/^\d{6}$/u.test(value)) {
		return "OTP must contain only numbers";
	}

	return null;
}
