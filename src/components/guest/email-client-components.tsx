"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import { useQueryState } from "nuqs";
import { z } from "zod";

import { Button } from "@/components/ui/recollect/button";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL, OTP_URL } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { cn } from "@/utils/tailwind-merge";

const emailSchema = z.object({
	email: z.email({ error: "Invalid email address" }),
});

export function EmailToOtpForm() {
	const router = useRouter();
	const [isPending, startTransition] = React.useTransition();
	const extendedIsPending = usePendingWithMinDuration(isPending);
	const [errors, setErrors] = React.useState<Record<string, string[]>>({});

	const handleFormSubmit = async (formValues: Form.Values) => {
		const result = emailSchema.safeParse(formValues);

		if (!result.success) {
			setErrors(z.flattenError(result.error).fieldErrors);
			return;
		}

		// Clear errors on valid submission
		setErrors({});

		startTransition(async () => {
			try {
				const email = result.data.email;

				const supabase = createClient();
				const { error } = await supabase.auth.signInWithOtp({
					email,
					options: {
						shouldCreateUser: true,
						emailRedirectTo: `${window.location.origin}/${EVERYTHING_URL}`,
					},
				});

				if (error) {
					handleClientError(error, "Failed to send verification code");
					return;
				}

				// Navigate immediately after success - same transition!
				router.push(`/${OTP_URL}?email=${encodeURIComponent(email)}`);
			} catch (error) {
				handleClientError(error, "Failed to send verification code");
			}
		});
	};

	return (
		<Form
			errors={errors}
			onFormSubmit={handleFormSubmit}
			className="flex w-full flex-col gap-4"
		>
			<React.Suspense fallback={<EmailField />}>
				<EmailFieldWithQueryState />
			</React.Suspense>

			<Button
				type="submit"
				className="gap-2 rounded-lg bg-gray-950 p-2 text-13 leading-[15px] font-medium text-gray-0 shadow-custom-2 hover:not-data-disabled:bg-gray-700"
				pending={extendedIsPending}
				disabled={extendedIsPending}
			>
				Continue with Email
			</Button>
		</Form>
	);
}

type EmailFieldProps = Pick<
	React.ComponentPropsWithRef<typeof Field.Control>,
	"value" | "onChange" | "autoFocus" | "ref"
>;

function EmailField({ ref, value, onChange, autoFocus }: EmailFieldProps) {
	return (
		<Field.Root name="email" className="flex flex-col gap-1">
			<Field.Control
				ref={ref}
				type="email"
				required
				autoFocus={autoFocus}
				aria-label="Email"
				value={value}
				inputMode="email"
				autoComplete="email"
				onChange={onChange}
				placeholder="Enter your email"
				className={cn(
					"bg-gray-alpha-100",
					"rounded-lg px-[10px] py-[7px]",
					"text-sm leading-4 text-gray-900",
					"placeholder:text-gray-600",
					"transition",
					"outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
					"data-invalid:bg-red-50 data-invalid:ring-red-600",
					"data-disabled:cursor-not-allowed data-disabled:opacity-50",
				)}
			/>
			<Field.Error className="text-xs text-red-600" />
		</Field.Root>
	);
}

function EmailFieldWithQueryState() {
	const [email, setEmail] = useQueryState("email", { defaultValue: "" });
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Select all text when email value is pre-filled for easy clearing
	useIsomorphicLayoutEffect(() => {
		if (inputRef.current && email) {
			inputRef.current.select();
		}
	}, []);

	return (
		<EmailField
			ref={inputRef}
			value={email}
			onChange={(event) => setEmail(event.target.value)}
			autoFocus
		/>
	);
}
