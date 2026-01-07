import { useBookmarkRelation } from "./use-bookmark-relation";
import { UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

/**
 * Reactively reads a bookmark's category IDs from the React Query cache.
 * Uses useSyncExternalStore (React 18 best practice) for proper cache subscription.
 * @param bookmarkId - The ID of the bookmark to get categories for
 * @returns Array of category IDs (excluding UNCATEGORIZED_CATEGORY_ID)
 */
export const useBookmarkCategories = (bookmarkId: number): number[] =>
	useBookmarkRelation(
		bookmarkId,
		(bookmark) => bookmark.addedCategories?.map((cat) => cat.id) ?? [],
		(id) => id !== UNCATEGORIZED_CATEGORY_ID,
	);
