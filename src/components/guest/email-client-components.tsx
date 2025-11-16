"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Form, Input, TextField } from "react-aria-components";
import { z } from "zod";

import { FieldError, inputStyles } from "../ui/recollect/field";

import { Button } from "@/components/ui/recollect/button";
import { createClient } from "@/lib/supabase/client";
import { ALL_BOOKMARKS_URL, OTP_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

export function EmailToOtpForm() {
	const [isPending, setIsPending] = React.useState(false);

	const router = useRouter();

	const handleFormAction = async (formData: FormData) => {
		const email = formData.get("email") as string;

		setIsPending(true);

		try {
			const supabase = createClient();
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
					shouldCreateUser: true,
					emailRedirectTo: `${window.location.origin}/${ALL_BOOKMARKS_URL}`,
				},
			});

			if (error) {
				throw error;
			}

			router.push(`/${OTP_URL}?email=${encodeURIComponent(email)}`);
		} catch (error) {
			handleClientError(error, "Failed to send verification code");
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Form action={handleFormAction} className="flex w-full flex-col gap-4">
			<EmailFieldWithQueryState />

			<Button type="submit" isPending={isPending} isDisabled={isPending}>
				Continue with Email
			</Button>
		</Form>
	);
}

function EmailFieldWithQueryState() {
	const [email, setEmail] = useQueryState("email", { defaultValue: "" });
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Select all text when email value is pre-filled for easy clearing
	React.useLayoutEffect(() => {
		if (inputRef.current && email) {
			// Browsers don't support setSelectionRange on email inputs
			// In those cases, we can temporarily change the type to text, select the text, then change back
			const input = inputRef.current;
			const originalType = input.type;
			input.type = "text";
			const length = email.length;
			input.setSelectionRange(0, length);
			input.type = originalType;
		}
		// This should only happen on the first mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<TextField
			type="email"
			name="email"
			autoFocus
			isRequired
			aria-label="Email"
			value={email}
			inputMode="email"
			autoComplete="email"
			onChange={setEmail}
			validate={validateEmail}
			className="flex flex-col gap-1"
		>
			<Input
				ref={inputRef}
				placeholder="Enter your email"
				className={inputStyles}
			/>
			<FieldError />
		</TextField>
	);
}

function validateEmail(value: string) {
	if (!value) {
		return "Email is required";
	}

	if (!z.email().safeParse(value).success) {
		return "Please enter a valid email address";
	}

	return null;
}
