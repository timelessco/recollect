import type React from "react";

import { SerwistProvider as NextSerwistProvider } from "@serwist/next/react";

interface SerwistProviderProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function SerwistProvider(props: SerwistProviderProps) {
  const { children, disabled } = props;

  if (process.env.NODE_ENV === "development" || disabled === true) {
    return children;
  }

  return <NextSerwistProvider swUrl="/sw.js">{children}</NextSerwistProvider>;
}
