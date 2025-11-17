import { type Metadata } from "next";

import {
	ContinueWithEmailLink,
	SignInWithGoogleForm,
} from "@/components/guest/login-client-components";
import { BASE_URL } from "@/site-config";
import { LOGIN_URL } from "@/utils/constants";
import { generatePageMetadata } from "@/utils/metadata-utils";

export const metadata: Metadata = generatePageMetadata({
	title: "Login",
	url: `${BASE_URL}/${LOGIN_URL}`,
});

export default function LoginPage() {
	return (
		<>
			<ContinueWithEmailLink />
			<SignInWithGoogleForm />
		</>
	);
}
