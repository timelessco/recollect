import "../styles/globals.css";

import type { AppProps } from "next/app";
import Head from "next/head";
import { useState } from "react";

import { HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import type { DehydratedState } from "@tanstack/react-query";

import { SerwistProvider } from "@/components/providers/serwist-provider";
import { IosAutozoomFix } from "@/components/scripts/ios-autozoom-fix";
import { MutationIndicator } from "@/components/ui/recollect/mutation-indicator";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { ToastSetup } from "@/components/ui/recollect/toast";

import { getBaseUrl } from "../utils/constants";

const MyApp = ({
  Component,
  pageProps: { ...pageProps },
}: AppProps<{
  dehydratedState: DehydratedState;
}>) => {
  // Create a client
  // oxlint-disable-next-line react/hook-use-state -- stable singleton, setter intentionally unused
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes stale time for normal navigation
            staleTime: 5 * 60 * 1000,
            // Refetch on tab focus if data is older than 30s (bypass staleTime)
            refetchOnWindowFocus: (query) =>
              Date.now() - query.state.dataUpdatedAt > 30 * 1000 ? "always" : false,
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
            <meta content={`${baseUrl}/bookmarks-signup-1.png`} property="og:image" />
            <meta content="product" property="og:type" />
            <meta content={baseUrl} property="og:url" />
            <meta content="Recollect" property="og:title" />
            <meta
              content="Open source bookmark manager built using Next js and Supabase"
              property="og:description"
            />
            <meta content="initial-scale=1.0, width=device-width" name="viewport" />
            {/* Twitter */}
            <meta content="summary" name="twitter:card" />
            <meta content={baseUrl} name="twitter:site" />
            <meta content="Recollect" name="twitter:title" />
            <meta
              content="Open source bookmark manager built using Next js and Supabase"
              name="twitter:description"
            />
            <meta content={`${baseUrl}/bookmarks-signup-1.png`} name="twitter:image" />
            {/* analytics script */}
            {/* process.env used intentionally — NODE_ENV inlined by Next.js during client hydration */}
            {process.env.NODE_ENV === "production" && (
              <script async data-website-id={process.env.UMAMI_ID} src={process.env.UMAMI_SRC} />
            )}
          </Head>

          <SerwistProvider>
            <Component {...pageProps} />
          </SerwistProvider>
        </HydrationBoundary>
        <IosAutozoomFix />
        <ToastSetup />
        <ReactQueryDevtools />
        <TailwindIndicator />
        <MutationIndicator />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default MyApp;
