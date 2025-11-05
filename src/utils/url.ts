import { type NextRouter } from "next/router";

/**
 * Extracts the category slug from the current Next.js router path.
 *
 * Example:
 *   - URL: /technology?sort=latest
 *   - Returns: "technology"
 *
 *   - URL: /
 *   - Returns: null
 *
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

	// router.asPath gives the full path with query string (e.g., "/technology?sort=latest")
	// Step 1: Split by "/" → ["", "technology?sort=latest"]
	// Step 2: Take index [1] → "technology?sort=latest"
	// Step 3: Split by "?" to remove query → ["technology", "sort=latest"]
	// Step 4: Take index [0] → "technology"
	return router?.asPath?.split("/")?.[1]?.split("?")?.[0] || null;
};
