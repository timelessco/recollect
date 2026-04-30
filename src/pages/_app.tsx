import "../styles/globals.css";

import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import Router from "next/router";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import type { DehydratedState } from "@tanstack/react-query";

import { ClientLoggerIdentityProvider } from "@/components/providers/client-logger-identity-provider";
import { SerwistProvider } from "@/components/providers/serwist-provider";
import { IosAutozoomFix } from "@/components/scripts/ios-autozoom-fix";
import { MutationIndicator } from "@/components/ui/recollect/mutation-indicator";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { ToastSetup } from "@/components/ui/recollect/toast";
import { emitRouteChange } from "@/lib/api-helpers/axiom-client-events";

import { getBaseUrl } from "../utils/constants";

export type NextPageWithLayout<P = Record<string, unknown>> = NextPage<P> & {
  getLayout?: (page: ReactElement, pageProps: P) => ReactElement;
};

const MyApp = ({
  Component,
  pageProps: { ...pageProps },
}: AppProps<{
  dehydratedState: DehydratedState;
}> & { Component: NextPageWithLayout }) => {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
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

  // Pages Router `route_change` emission. App Router navigations are
  // handled by <AppRouterRouteChangeEmitter /> inside `components/providers`.
  // `Router.asPath` and the `routeChangeComplete` url both include the raw
  // query string (e.g. `/everything?q=secret`); strip it before emitting so
  // user-entered search text never lands in Axiom. Query *keys* (not values)
  // are captured separately inside `emitRouteChange`.
  useEffect(() => {
    const stripQuery = (path: string) => path.split(/[?#]/)[0] ?? path;
    let previous = stripQuery(Router.asPath);
    const onRouteChangeComplete = (next: string) => {
      const nextPath = stripQuery(next);
      if (nextPath === previous) {
        return;
      }
      const from = previous;
      previous = nextPath;
      emitRouteChange(from, nextPath);
    };
    Router.events.on("routeChangeComplete", onRouteChangeComplete);
    return () => {
      Router.events.off("routeChangeComplete", onRouteChangeComplete);
    };
  }, []);

  return (
    <ThemeProvider attribute="class">
      <QueryClientProvider client={queryClient}>
        <ClientLoggerIdentityProvider />
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

          <SerwistProvider>{getLayout(<Component {...pageProps} />, pageProps)}</SerwistProvider>
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
