import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";

import { type Metadata, type Viewport } from "next";
import { ToastContainer } from "react-toastify";

import { Providers } from "@/components/providers";
import { AnalyticsScript } from "@/components/scripts/analytics-script";
import { TailwindIndicator } from "@/components/ui/recollect/tailwind-indicator";
import { inter } from "@/styles/font";
import { rootMetaData, rootViewport } from "@/utils/metadata-utils";

type RootLayoutProps = {
	readonly children: React.ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
	const { children } = props;

	return (
		<html
			lang="en"
			className={`optimize-legibility inter-display antialiased ${inter.variable}`}
			dir="ltr"
		>
			<body className="bg-gray-0 overflow-hidden outline-hidden">
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
