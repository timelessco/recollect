import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html lang="en" dir="ltr">
			<Head />

			<body className="bg-gray-0 optimize-legibility inter-display overflow-hidden antialiased outline-hidden">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
