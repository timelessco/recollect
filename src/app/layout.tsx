import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";

import { Providers } from "@/components/providers";
import { AnalyticsScript } from "@/components/scripts/analytics-script";
import { IosAutozoomFix } from "@/components/scripts/ios-autozoom-fix";
import { ReactGrabScript } from "@/components/scripts/react-grab-script";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { ToastSetup } from "@/components/ui/recollect/toast";
import { rootMetaData, rootViewport } from "@/utils/metadata-utils";

type RootLayoutProps = {
	readonly children: React.ReactNode;
};

export default async function RootLayout(props: RootLayoutProps) {
	const { children } = props;

	return (
		<html
			lang="en"
			dir="ltr"
			className="antialiased inter-display optimize-legibility"
			suppressHydrationWarning
		>
			<body className="overflow-x-hidden bg-gray-0 outline-hidden">
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
