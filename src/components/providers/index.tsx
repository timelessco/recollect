import { type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ReactAriaProvider } from "./react-aria-provider";
import { ReactQueryProvider } from "./react-query-provider";

interface ProvidersProps {
	readonly children: ReactNode;
}

export function Providers(props: ProvidersProps) {
	const { children } = props;

	return (
		<ReactAriaProvider>
			<NuqsAdapter>
				<ReactQueryProvider>{children}</ReactQueryProvider>
			</NuqsAdapter>
		</ReactAriaProvider>
	);
}
