import { SignInWithGoogleForm } from "@/components/guest/login-form";
import { NextLink } from "@/components/ui/recollect/next-link";
import { LaterpadLogoIcon } from "@/icons/laterpad-logo-icon";

export default function LoginPage() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-[300px] flex-col justify-center">
			{/* Header */}
			<header className="mb-[21px] flex items-center justify-center text-2xl leading-7 font-semibold tracking-[0.24px]">
				<LaterpadLogoIcon className="mr-1.5 text-3xl" />

				<p className="text-plain-reverse">recollect</p>
			</header>

			<main className="flex flex-col items-center justify-center gap-4">
				<NextLink
					className="bg-gray-alpha-100 w-full text-gray-950 shadow-none hover:bg-gray-300"
					href="/email"
					asButton
				>
					Continue with Email
				</NextLink>

				<SignInWithGoogleForm />
			</main>
		</div>
	);
}
