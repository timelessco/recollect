import { useCallback, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useBookmarkMutationContext } from "./useBookmarkMutationContext";
import { type PaginatedBookmarks, type SingleListData } from "@/types/apiTypes";

/**
 * Generic hook for reactively reading bookmark relations from React Query cache.
 * Uses useSyncExternalStore (React 18 best practice) for proper cache subscription.
 * @param bookmarkId - The ID of the bookmark to get relations for
 * @param extractFn - Function to extract relation IDs from bookmark data
 * @param filterFn - Optional function to filter relation IDs
 * @returns Array of relation IDs
 */
export const useBookmarkRelation = (
	bookmarkId: number,
	extractFn: (bookmark: SingleListData) => number[],
	filterFn?: (id: number) => boolean,
): number[] => {
	const queryClient = useQueryClient();
	const { queryKey, searchQueryKey } = useBookmarkMutationContext();

	// Cache previous result to avoid returning new array reference when contents unchanged
	const cachedRef = useRef<number[]>([]);

	// Subscribe to React Query cache changes
	const subscribe = useCallback(
		(callback: () => void) =>
			queryClient.getQueryCache().subscribe((event) => {
				// Only trigger for bookmark-related query changes
				if (
					event.query.queryKey[0] === queryKey[0] ||
					(searchQueryKey && event.query.queryKey[0] === searchQueryKey[0])
				) {
					// eslint-disable-next-line n/callback-return
					callback();
				}
			}),
		[queryClient, queryKey, searchQueryKey],
	);

	// Get current relation IDs from cache with stable reference
	const getSnapshot = useCallback((): number[] => {
		let result: number[] = [];

		// Try primary query
		const primaryData = queryClient.getQueryData<PaginatedBookmarks>(queryKey);
		for (const page of primaryData?.pages ?? []) {
			const bookmark = page.data.find((bm) => bm.id === bookmarkId);
			if (bookmark) {
				result = extractFn(bookmark);
				if (filterFn) {
					result = result.filter(filterFn);
				}

				break;
			}
		}

		// Try search query if not found and search key exists
		if (result.length === 0 && searchQueryKey) {
			const searchData =
				queryClient.getQueryData<PaginatedBookmarks>(searchQueryKey);
			for (const page of searchData?.pages ?? []) {
				const bookmark = page.data.find((bm) => bm.id === bookmarkId);
				if (bookmark) {
					result = extractFn(bookmark);
					if (filterFn) {
						result = result.filter(filterFn);
					}

					break;
				}
			}
		}

		// Return cached reference if contents are the same (prevents infinite re-renders)
		const cached = cachedRef.current;
		if (
			cached.length === result.length &&
			cached.every((id, idx) => id === result[idx])
		) {
			return cached;
		}

		// Update cache and return new reference
		cachedRef.current = result;
		return result;
	}, [queryClient, queryKey, searchQueryKey, bookmarkId, extractFn, filterFn]);

	return useSyncExternalStore(subscribe, getSnapshot);
};
