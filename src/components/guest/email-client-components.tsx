"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import { useQueryState } from "nuqs";
import { z } from "zod";

import { Button } from "@/components/ui/recollect/button";
import { usePendingWithMinDuration } from "@/hooks/use-pending-with-min-duration";
import { createClient } from "@/lib/supabase/client";
import { EVERYTHING_URL, OTP_URL } from "@/utils/constants";
import { useHandleClientError } from "@/utils/error-utils/client";
import { cn } from "@/utils/tailwind-merge";

const emailSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
});

export function EmailToOtpForm() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const extendedIsPending = usePendingWithMinDuration(isPending);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const handleClientError = useHandleClientError();

  const handleFormSubmit = (formValues: Form.Values) => {
    const result = emailSchema.safeParse(formValues);

    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors);
      return;
    }

    // Clear errors on valid submission
    setErrors({});

    startTransition(async () => {
      try {
        const { email } = result.data;

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/${EVERYTHING_URL}`,
            shouldCreateUser: true,
          },
        });

        if (error) {
          handleClientError(error, "Failed to send verification code");
          return;
        }

        router.push(`/${OTP_URL}?email=${encodeURIComponent(email)}`);
      } catch (error) {
        handleClientError(error, "Failed to send verification code");
      }
    });
  };

  return (
    <Form className="flex w-full flex-col gap-4" errors={errors} onFormSubmit={handleFormSubmit}>
      {/*
        `useQueryState` reads from `useSearchParams`, which opts the whole route
        out of static rendering unless wrapped in a Suspense boundary. Isolating
        it here keeps the rest of the form static; the fallback renders a plain
        autofocused input so the field is usable immediately during hydration.
      */}
      <React.Suspense fallback={<EmailField autoFocus />}>
        <EmailFieldWithQueryState />
      </React.Suspense>

      <Button
        className="gap-2 rounded-xl bg-gray-950 px-2 py-2.5 text-sm leading-[115%] font-medium text-gray-0 shadow-custom-2 hover:not-data-disabled:bg-gray-700"
        disabled={extendedIsPending}
        pending={extendedIsPending}
        type="submit"
      >
        Continue with Email
      </Button>
    </Form>
  );
}

type EmailFieldProps = Pick<
  React.ComponentPropsWithRef<typeof Field.Control>,
  "autoFocus" | "onChange" | "ref" | "value"
>;

function EmailField(props: EmailFieldProps) {
  const { autoFocus, onChange, ref, value } = props;

  return (
    <Field.Root className="flex flex-col gap-1" name="email">
      <Field.Control
        aria-label="Email"
        autoComplete="email"
        autoFocus={autoFocus}
        className={cn(
          "bg-gray-50",
          "rounded-[10px] px-[10px] py-2.5",
          "text-sm leading-[115%] text-gray-800",
          "placeholder:text-gray-600",
          "transition",
          "outline-1 outline-gray-300 focus-visible:ring-2 focus-visible:ring-gray-200",
          "data-invalid:bg-red-50 data-invalid:ring-red-600",
          "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        )}
        inputMode="email"
        onChange={onChange}
        placeholder="Enter your email"
        ref={ref}
        required
        type="email"
        value={value}
      />
      <Field.Error className="text-xs text-red-600" />
    </Field.Root>
  );
}

function EmailFieldWithQueryState() {
  const [urlEmail] = useQueryState("email", { defaultValue: "" });
  const [localEmail, setLocalEmail] = React.useState(urlEmail);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Select all text when email value is pre-filled for easy clearing
  useIsomorphicLayoutEffect(() => {
    if (inputRef.current && urlEmail) {
      inputRef.current.select();
    }
  }, []);

  return (
    <EmailField
      autoFocus
      onChange={(event) => {
        setLocalEmail(event.target.value);
      }}
      ref={inputRef}
      value={localEmail}
    />
  );
}
