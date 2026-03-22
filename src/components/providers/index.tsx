import type { ReactNode } from "react";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { MutationIndicator } from "@/components/ui/recollect/mutation-indicator";

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
          {children}
          <MutationIndicator />
        </ReactQueryProvider>
      </NuqsAdapter>
    </ThemeProvider>
  );
}
