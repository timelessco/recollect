import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";

import { type Metadata, type Viewport } from "next";
import { headers } from "next/headers";
import { isRTL } from "react-aria-components";
import { ToastContainer } from "react-toastify";

import { Providers } from "@/components/providers";
import { AnalyticsScript } from "@/components/scripts/analytics-script";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { rootMetaData, rootViewport } from "@/utils/metadata-utils";

type RootLayoutProps = {
	readonly children: React.ReactNode;
};

export default async function RootLayout(props: RootLayoutProps) {
	const { children } = props;

	// Get the user's preferred language from the Accept-Language header.
	// You could also get this from a database, URL param, etc.
	const acceptLanguage = (await headers()).get("accept-language");
	const lang = acceptLanguage?.split(/[,;]/u)[0] || "en-US";

	return (
		<html
			lang={lang}
			dir={isRTL(lang) ? "rtl" : "ltr"}
			className="antialiased inter-display optimize-legibility"
		>
			<body className="overflow-hidden bg-gray-0 outline-hidden">
				<Providers>{children}</Providers>

				<AnalyticsScript />

				<ToastContainer />
				<TailwindIndicator />
			</body>
		</html>
	);
}

export const metadata: Metadata = rootMetaData;
export const viewport: Viewport = rootViewport;
