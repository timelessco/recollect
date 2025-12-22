import { type NextRouter } from "next/router";

/**
 * Extracts the category slug from the current Next.js router path.
 *
 * Example:
 * - URL: /technology?sort=latest
 * - Returns: "technology"
 *
 * - URL: /public/username/category-slug
 * - Returns: "category-slug"
 *
 * - URL: /
 * - Returns: null
 * @param router The Next.js router instance
 * @returns The category slug (string) or null if not found
 */
export const getCategorySlugFromRouter = (
	router: NextRouter,
): string | null => {
	// Ensure we are running on the client (window is not available on server-side)
	if (typeof window === "undefined") {
		return null;
	}

	const pathSegments = router?.asPath?.split("/")?.filter(Boolean) || [];

	// Handle public routes: /public/[user_name]/[category_slug]
	if (pathSegments[0] === "public" && pathSegments.length >= 3) {
		return pathSegments[2]?.split("?")?.[0] || null;
	}

	// Handle authenticated routes: /[category_slug]
	// router.asPath gives the full path with query string (e.g., "/technology?sort=latest")
	// Step 1: Split by "/" → ["", "technology?sort=latest"]
	// Step 2: Take index [1] → "technology?sort=latest"
	// Step 3: Split by "?" to remove query → ["technology", "sort=latest"]
	// Step 4: Take index [0] → "technology"
	return router?.asPath?.split("/")?.[1]?.split("?")?.[0] || null;
};

/**
 * Extracts user_name and category slug from public page routes.
 *
 * Example:
 * - URL: /public/john/technology
 * - Returns: { user_name: "john", category_slug: "technology" }
 *
 * - URL: /public/john/technology/preview/123
 * - Returns: { user_name: "john", category_slug: "technology" }
 * @param router The Next.js router instance
 * @returns Object with user_name and category_slug, or null if not a public route
 */
export const getPublicPageInfo = (
	router: NextRouter,
): { user_name: string; category_slug: string } | null => {
	// Ensure we are running on the client (window is not available on server-side)
	if (typeof window === "undefined") {
		return null;
	}

	const pathSegments = router?.asPath?.split("/")?.filter(Boolean) || [];

	// Check if this is a public route: /public/[user_name]/[category_slug]
	if (pathSegments[0] === "public" && pathSegments.length >= 3) {
		const user_name = pathSegments[1];
		const category_slug = pathSegments[2]?.split("?")?.[0];

		if (user_name && category_slug) {
			return { user_name, category_slug };
		}
	}

	return null;
};
