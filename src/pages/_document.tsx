import { Head, Html, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
	return (
		<Html lang="en" dir="ltr">
			<Head>
				{process.env.NODE_ENV === "development" && (
					<Script
						src="//unpkg.com/react-grab/dist/index.global.js"
						crossOrigin="anonymous"
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
