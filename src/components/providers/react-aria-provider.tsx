"use client";

import { useRouter } from "next/navigation";
import { RouterProvider } from "react-aria-components";

declare module "react-aria-components" {
	interface RouterConfig {
		routerOptions: NonNullable<
			Parameters<ReturnType<typeof useRouter>["push"]>[1]
		>;
	}
}

interface ReactAriaProviderProps {
	children: React.ReactNode;
}

export function ReactAriaProvider(props: ReactAriaProviderProps) {
	const { children } = props;

	const router = useRouter();

	// eslint-disable-next-line @typescript-eslint/unbound-method
	return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
}
