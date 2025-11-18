import { type Metadata } from "next";

import { EmailToOtpForm } from "@/components/guest/email-client-components";
import { BASE_URL } from "@/site-config";
import { EMAIL_URL } from "@/utils/constants";
import { generatePageMetadata } from "@/utils/metadata-utils";

export const metadata: Metadata = generatePageMetadata({
	title: "Email",
	url: `${BASE_URL}/${EMAIL_URL}`,
});

export default function EmailPage() {
	return <EmailToOtpForm />;
}
