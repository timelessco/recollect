import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { AnalyticsScript } from "@/components/scripts/analytics-script";
import { IosAutozoomFix } from "@/components/scripts/ios-autozoom-fix";
import { ReactGrabScript } from "@/components/scripts/react-grab-script";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { ToastSetup } from "@/components/ui/recollect/toast";
import { WebVitals } from "@/lib/api-helpers/axiom-client";
import { rootMetaData, rootViewport } from "@/utils/metadata-utils";

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout(props: RootLayoutProps) {
  const { children } = props;

  return (
    <html
      className="antialiased inter-display optimize-legibility"
      dir="ltr"
      lang="en"
      suppressHydrationWarning
    >
      <body className="overflow-x-hidden bg-gray-0 outline-hidden">
        <WebVitals />
        <Providers>{children}</Providers>

        <AnalyticsScript />
        <IosAutozoomFix />
        <ReactGrabScript />

        <ToastSetup />
        <TailwindIndicator />
      </body>
    </html>
  );
}

export const metadata: Metadata = rootMetaData;
export const viewport: Viewport = rootViewport;
