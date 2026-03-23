import Script from "next/script";

import { env } from "@/env/server";

export const ReactGrabScript = () => {
  // Only render in development
  if (env.NODE_ENV !== "development") {
    return null;
  }

  return (
    /* oxlint-disable nextjs/no-before-interactive-script-outside-document */
    <Script
      crossOrigin="anonymous"
      data-enabled="true"
      src="//unpkg.com/react-grab/dist/index.global.js"
      strategy="beforeInteractive"
    />
  );
};
