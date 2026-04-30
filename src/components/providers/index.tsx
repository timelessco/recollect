import type { ReactNode } from "react";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { MutationIndicator } from "@/components/ui/recollect/mutation-indicator";

import { AppRouterRouteChangeEmitter } from "./app-router-route-change-emitter";
import { ClientLoggerIdentityProvider } from "./client-logger-identity-provider";
import { ReactQueryProvider } from "./react-query-provider";

interface ProvidersProps {
  readonly children: ReactNode;
}

export function Providers(props: ProvidersProps) {
  const { children } = props;

  return (
    <ThemeProvider attribute="class">
      <NuqsAdapter>
        <ReactQueryProvider>
          <ClientLoggerIdentityProvider />
          <AppRouterRouteChangeEmitter />
          {children}
          <MutationIndicator />
        </ReactQueryProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
