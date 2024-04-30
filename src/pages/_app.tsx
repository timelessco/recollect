import { useEffect, useState } from "react";
import { type AppProps } from "next/app";
import Head from "next/head";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import {
	SessionContextProvider,
	type Session,
} from "@supabase/auth-helpers-react";
import {
	Hydrate,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "../styles/globals.css";

import NProgress from "nprogress";

import { supabaseAnonKey, supabaseUrl } from "../utils/supabaseClient";

import "nprogress/nprogress.css";

import Router from "next/router";

const MyApp = ({
	Component,
	pageProps: { ...pageProps },
}: AppProps<{
	dehydratedState: unknown;
	initialSession: Session | null | undefined;
}>) => {
	// Create a client
	// const queryClient = new QueryClient();

	// Create a new supabase browser client on every first render.
	const [supabaseClient] = useState(() =>
		createBrowserSupabaseClient({
			supabaseUrl,
			supabaseKey: supabaseAnonKey,
		}),
	);

	useEffect(() => {
		Router.events.on("routeChangeStart", NProgress.start);
		Router.events.on("routeChangeComplete", NProgress.done);
		Router.events.on("routeChangeError", NProgress.done);
		return () => {
			Router.events.off("routeChangeStart", NProgress.start);
			Router.events.off("routeChangeComplete", NProgress.done);
			Router.events.off("routeChangeError", NProgress.done);
		};
	}, []);

	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	const productionUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

	return (
		<SessionContextProvider
			initialSession={pageProps.initialSession}
			supabaseClient={supabaseClient}
		>
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
		</SessionContextProvider>
	);
};

export default MyApp;
