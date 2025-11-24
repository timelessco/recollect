import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { VerifyOtpForm } from "@/components/guest/otp-client-components";
import { BASE_URL } from "@/site-config";
import { EMAIL_URL, OTP_URL } from "@/utils/constants";
import { generatePageMetadata } from "@/utils/metadata-utils";

export const metadata: Metadata = generatePageMetadata({
	title: "OTP",
	url: `${BASE_URL}/${OTP_URL}`,
});

const emailSchema = z.email({ message: "Invalid email address" });

interface OtpPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

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

	return <VerifyOtpForm email={email} />;
}
