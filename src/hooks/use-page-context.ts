import { useMemo } from "react";
import { useRouter } from "next/router";

import { DISCOVER_URL, isPublicPath } from "@/utils/constants";
import { getCategorySlugFromRouter } from "@/utils/url";

/**
 * Page context information derived from router
 */
export type PageContext = {
	/**
	 * Whether the current page is a public page (e.g., /public/user/collection)
	 */
	isPublicPage: boolean;
	/**
	 * Whether the current page is the discover page
	 */
	isDiscoverPage: boolean;
	/**
	 * Current category slug from the URL, or null if not in a category route
	 */
	categorySlug: string | null;
};

/**
 * Hook to get page context information from the router
 *
 * This hook provides a centralized way to determine the current page type
 * and category context, eliminating the need to pass these values as props
 * through multiple component layers.
 * @example
 * ```tsx
 * const { isPublicPage, isDiscoverPage, categorySlug } = usePageContext();
 *
 * if (isPublicPage) {
 *   // Public page logic
 * }
 *
 * if (isDiscoverPage) {
 *   // Discover page logic
 * }
 * ```
 */
export const usePageContext = (): PageContext => {
	const router = useRouter();

	return useMemo(() => {
		const categorySlug = getCategorySlugFromRouter(router);

		return {
			isPublicPage: isPublicPath(router.asPath),
			isDiscoverPage: categorySlug === DISCOVER_URL,
			categorySlug,
		};
	}, [router]);
};
