import { type Metadata } from "next";

import { buttonBaseClasses } from "@/components/ui/recollect/button";
import { Link } from "@/components/ui/recollect/link";
import { BASE_URL } from "@/site-config";
import { generatePageMetadata } from "@/utils/metadata-utils";
import { cn } from "@/utils/tailwind-merge";

export const metadata: Metadata = generatePageMetadata({
	title: "Error",
	url: `${BASE_URL}/error`,
});

interface ErrorPageProps {
	searchParams: Promise<{ error?: string; status?: string }>;
}

export default async function Page(props: ErrorPageProps) {
	const { searchParams } = props;
	const params = await searchParams;

	return (
		<div className="antialiased optimize-legibility" lang="en">
			<div className="min-h-dvh bg-plain-reverse px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
				<div className="mx-auto max-w-max">
					<main className="sm:flex">
						<p className="mt-4 bg-clip-text text-4xl font-bold tracking-tight text-plain sm:text-5xl">
							{params?.status ?? "ERROR"}
						</p>

						<div className="sm:ml-6">
							<div className="sm:border-l sm:border-gray-200 sm:pl-6">
								<h1 className="text-4xl font-bold tracking-tight text-plain sm:text-5xl">
									Something went wrong!
								</h1>

								{params?.error ? (
									<p className="mt-1 text-base text-gray-400">{params.error}</p>
								) : (
									<p className="mt-1 text-base text-gray-400">
										Sorry, an unexpected error occurred.
									</p>
								)}
							</div>

							<div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
								<Link
									className={cn(
										buttonBaseClasses,
										"rounded-md border-transparent bg-plain px-4 py-2 text-base font-medium text-plain-reverse no-underline shadow-xs",
									)}
									href="/login"
								>
									Go back to login
								</Link>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
