import Script from "next/script";

import { env } from "@/env/server";

export const AnalyticsScript = () => {
  // Only render in production
  if (env.NODE_ENV !== "production") {
    return null;
  }

  // Check if environment variables are available
  if (!env.UMAMI_ID || !env.UMAMI_SRC) {
    return null;
  }

  return (
    <Script async data-website-id={env.UMAMI_ID} src={env.UMAMI_SRC} strategy="afterInteractive" />
  );
};
