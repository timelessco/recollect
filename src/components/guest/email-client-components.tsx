"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Form, Input, TextField } from "react-aria-components";
import { z } from "zod";

import { FieldError, inputStyles } from "../ui/recollect/field";

import { Button } from "@/components/ui/recollect/button";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { createClient } from "@/lib/supabase/client";
import { ALL_BOOKMARKS_URL, OTP_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";

export function EmailToOtpForm() {
	const router = useRouter();
	const [isPending, startTransition] = React.useTransition();
	const extendedIsPending = usePendingWithMinDuration(isPending);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		startTransition(async () => {
			try {
				const formData = new FormData(event.currentTarget);
				const email = formData.get("email") as string;

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

				// Navigate immediately after success - same transition!
				router.push(`/${OTP_URL}?email=${encodeURIComponent(email)}`);
			} catch (error) {
				handleClientError(error, "Failed to send verification code");
			}
		});
	};

	return (
		<Form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
			<EmailFieldWithQueryState />

			<Button
				type="submit"
				isPending={extendedIsPending}
				isDisabled={extendedIsPending}
			>
				Continue with Email
			</Button>
		</Form>
	);
}

function EmailFieldWithQueryState() {
	const [email, setEmail] = useQueryState("email", { defaultValue: "" });
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Select all text when email value is pre-filled for easy clearing
	useIsomorphicLayoutEffect(() => {
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
