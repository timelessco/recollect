import * as React from "react";

import { RecollectLogoIcon } from "@/icons/recollect-logo-icon";

interface AuthLayoutProps {
	children: React.ReactNode;
}

export default function AuthLayout(props: AuthLayoutProps) {
	const { children } = props;

	return (
		<div className="mx-auto flex min-h-dvh max-w-[300px] flex-col justify-center">
			<header className="mb-[21px] flex items-center justify-center">
				<RecollectLogoIcon
					className="h-[23px] w-[19px] text-plain-reverse"
					aria-label="Recollect"
				/>
			</header>

			<main className="flex flex-col items-center justify-center gap-4">
				{children}
			</main>
		</div>
	);
}
