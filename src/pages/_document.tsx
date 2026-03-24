import { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

import { env } from "@/env/server";

export default function Document() {
  return (
    <Html dir="ltr" lang="en">
      <Head>
        {env.NODE_ENV === "development" && (
          <Script
            crossOrigin="anonymous"
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="beforeInteractive"
          />
        )}
      </Head>

      <body className="overflow-x-hidden bg-gray-0 antialiased outline-hidden inter-display optimize-legibility">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
