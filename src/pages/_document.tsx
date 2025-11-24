import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html lang="en" dir="ltr">
			<Head />

			<body className="overflow-x-hidden bg-gray-0 antialiased outline-hidden inter-display optimize-legibility">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
