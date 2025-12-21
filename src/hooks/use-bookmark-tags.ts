import { useBookmarkRelation } from "./use-bookmark-relation";

/**
 * Reactively reads a bookmark's tag IDs from the React Query cache.
 * Uses useSyncExternalStore (React 18 best practice) for proper cache subscription.
 * @param bookmarkId - The ID of the bookmark to get tags for
 * @returns Array of tag IDs
 */
export const useBookmarkTags = (bookmarkId: number): number[] =>
	useBookmarkRelation(
		bookmarkId,
		(bookmark) => bookmark.addedTags?.map((tag) => tag.id) ?? [],
	);
