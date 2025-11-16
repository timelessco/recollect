import { redirect } from "next/navigation";
import { z } from "zod";

import { VerifyOtpForm } from "@/components/guest/otp-client-components";
import { LaterpadLogoIcon } from "@/icons/laterpad-logo-icon";
import { EMAIL_URL } from "@/utils/constants";

interface OtpPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const emailSchema = z.string().email({ message: "Invalid email address" });

export default async function OtpPage(props: OtpPageProps) {
	const { searchParams } = props;
	const { email } = await searchParams;

	// Server-side validation: redirect if email param is missing, invalid type, or not a valid email
	if (!email || typeof email !== "string") {
		redirect(
			`/${EMAIL_URL}${email ? `?email=${encodeURIComponent(String(email))}` : ""}`,
		);
	}

	const validationResult = emailSchema.safeParse(email);

	if (!validationResult.success) {
		redirect(`/${EMAIL_URL}?email=${encodeURIComponent(email)}`);
	}

	return (
		<div className="mx-auto flex min-h-dvh max-w-[300px] flex-col justify-center">
			{/* Header */}
			<header className="mb-[21px] flex items-center justify-center text-2xl leading-7 font-semibold tracking-[0.24px]">
				<LaterpadLogoIcon className="mr-1.5 text-3xl" />

				<p className="text-plain-reverse">recollect</p>
			</header>

			<main className="flex flex-col items-center justify-center gap-4">
				<VerifyOtpForm email={email} />
			</main>
		</div>
	);
}
