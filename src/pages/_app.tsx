import { useEffect, useState } from "react";
import { type AppProps } from "next/app";
import Head from "next/head";
import {
	Hydrate,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "../styles/globals.css";

const MyApp = ({
	Component,
	pageProps: { ...pageProps },
}: AppProps<{
	dehydratedState: unknown;
}>) => {
	// Create a client

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
	useEffect(() => {
		document.documentElement.classList.add("dark");
	}, []);
	const productionUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

	return (
		<QueryClientProvider client={queryClient}>
			<Hydrate state={pageProps.dehydratedState}>
				<Head>
					<title>Recollect</title>
					<meta
						content={`${productionUrl}/bookmarks-signup-1.png`}
						property="og:image"
					/>
					<meta content="product" property="og:type" />
					<meta content={productionUrl} property="og:url" />
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
					<meta content={productionUrl} name="twitter:site" />
					<meta content="Recollect" name="twitter:title" />
					<meta
						content="Open source bookmark manager built using Next js and Supabase"
						name="twitter:description"
					/>
					<meta
						content={`${productionUrl}/bookmarks-signup-1.png`}
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
			</Hydrate>
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
};

export default MyApp;
