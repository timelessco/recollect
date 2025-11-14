// Error components must be Client Components
// @see https://nextjs.org/docs/app/api-reference/file-conventions/error
"use client";

import * as React from "react";
import * as Sentry from "@sentry/nextjs";

type ErrorProps = {
	readonly error: Error & {
		digest?: string;
	};
	readonly reset: () => void;
};

export default function Error(props: ErrorProps) {
	const { error, reset } = props;

	React.useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			console.error("Root error", error);
		}

		Sentry.captureException(error, {
			extra: { errorMessage: "Root error" },
		});
	}, [error]);

	return (
		<div className="optimize-legibility antialiased" lang="en">
			<div className="min-h-dvh bg-black px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
				<div className="mx-auto max-w-max">
					<main className="sm:flex">
						<p className="mt-4 bg-[#171717] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
							ERROR
						</p>

						<div className="sm:ml-6">
							<div className="sm:border-l sm:border-gray-200 sm:pl-6">
								<h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
									Something went wrong!
								</h1>

								<p className="mt-1 text-base text-gray-400">
									Sorry, an unspecified error occurred.
								</p>
							</div>

							<div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
								<button
									className="inline-flex items-center rounded-md border-transparent bg-[#171717] px-4 py-2 text-base font-medium text-white shadow-xs outline-hidden transition-all hover:bg-[#c18f33] hover:bg-linear-to-br focus-visible:ring-2 focus-visible:ring-white"
									onClick={() => {
										reset();
									}}
									type="button"
								>
									Try again
								</button>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
