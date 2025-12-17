import { useState } from "react";
import { type AppProps } from "next/app";
import Head from "next/head";
import {
	HydrationBoundary,
	QueryClient,
	QueryClientProvider,
	type DehydratedState,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import { getBaseUrl } from "../utils/constants";

import { MutationIndicator } from "@/components/ui/recollect/mutation-indicator";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";

import "../styles/globals.css";

const MyApp = ({
	Component,
	pageProps: { ...pageProps },
}: AppProps<{
	dehydratedState: DehydratedState;
}>) => {
	// Create a client
	// eslint-disable-next-line react/hook-use-state
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: true,
						staleTime: 5 * 60 * 1_000,
					},
				},
			}),
	);
	const baseUrl = getBaseUrl();

	return (
		<ThemeProvider attribute="class">
			<QueryClientProvider client={queryClient}>
				<HydrationBoundary state={pageProps.dehydratedState}>
					<Head>
						<title>Recollect</title>
						<meta
							content={`${baseUrl}/bookmarks-signup-1.png`}
							property="og:image"
						/>
						<meta content="product" property="og:type" />
						<meta content={baseUrl} property="og:url" />
						<meta content="Recollect" property="og:title" />
						<meta
							content="Open source bookmark manager built using Next js and Supabase"
							property="og:description"
						/>
						<meta
							content="initial-scale=1.0, width=device-width"
							name="viewport"
						/>
						{/* Twitter */}
						<meta content="summary" name="twitter:card" />
						<meta content={baseUrl} name="twitter:site" />
						<meta content="Recollect" name="twitter:title" />
						<meta
							content="Open source bookmark manager built using Next js and Supabase"
							name="twitter:description"
						/>
						<meta
							content={`${baseUrl}/bookmarks-signup-1.png`}
							name="twitter:image"
						/>
						{/* analytics script */}
						{process.env.NODE_ENV === "production" && (
							<script
								async
								data-website-id={process.env.UMAMI_ID}
								src={process.env.UMAMI_SRC}
							/>
						)}
					</Head>

					<Component {...pageProps} />
				</HydrationBoundary>
				<ReactQueryDevtools />
				<TailwindIndicator />
				<MutationIndicator />
			</QueryClientProvider>
		</ThemeProvider>
	);
};

export default MyApp;
