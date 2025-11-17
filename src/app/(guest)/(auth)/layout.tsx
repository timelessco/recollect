import * as React from "react";

import { LaterpadLogoIcon } from "@/icons/laterpad-logo-icon";

interface AuthLayoutProps {
	children: React.ReactNode;
}

export default function AuthLayout(props: AuthLayoutProps) {
	const { children } = props;

	return (
		<div className="mx-auto flex min-h-dvh max-w-[300px] flex-col justify-center">
			<header className="mb-[21px] flex items-center justify-center text-2xl leading-7 font-semibold tracking-[0.24px]">
				<LaterpadLogoIcon className="mr-1.5 text-3xl" />
				<p className="text-plain-reverse">recollect</p>
			</header>

			<main className="flex flex-col items-center justify-center gap-4">
				{children}
			</main>
		</div>
	);
}
