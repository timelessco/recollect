import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 * Always false during SSR and on the initial client render (before hydration).
 *
 * Use this to avoid hydration mismatch when rendering different content
 * on server vs client (e.g. static SSR subset, then virtualized list after mount).
 */
export const useMounted = (): boolean => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return mounted;
};
