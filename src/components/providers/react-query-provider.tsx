"use client";

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import type * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { getQueryClient } from "@/lib/react-query/get-query-client";

type ReactQueryProviderProps = {
	children: React.ReactNode;
};

export const ReactQueryProvider = (props: ReactQueryProviderProps) => {
	const { children } = props;

	// NOTE: Avoid useState when initializing the query client if you don't
	//       have a suspense boundary between this and the code that may
	//       suspend because React will throw away the client on the initial
	//       render if it suspends and there is no boundary
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
		</QueryClientProvider>
	);
};
