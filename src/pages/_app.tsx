import { useState } from "react";
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
import { supabaseAnonKey, supabaseUrl } from "../utils/supabaseClient";

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
							content="https://www.recollect.so/bookmarks-signup-1.png"
							property="og:image"
						/>
						<meta
							content="initial-scale=1.0, width=device-width"
							name="viewport"
						/>
					</Head>
					<Component {...pageProps} />
				</Hydrate>
				<ReactQueryDevtools />
			</QueryClientProvider>
		</SessionContextProvider>
	);
};

export default MyApp;
