import { useCallback, useRef, useSyncExternalStore } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type { PaginatedBookmarks, SingleListData } from "@/types/apiTypes";

import { BOOKMARKS_KEY, SIMILAR_URL } from "@/utils/constants";

import { useBookmarkMutationContext } from "./use-bookmark-mutation-context";

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

  // Subscribe to React Query cache changes (useSyncExternalStore pattern, not async callback)
  const subscribe = useCallback(
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    (callback: () => void) =>
      queryClient.getQueryCache().subscribe((event) => {
        // Only trigger for bookmark-related query changes
        // oxlint-disable-next-line no-unsafe-assignment -- React Query QueryCacheNotifyEvent.query.queryKey is typed as any
        const eventKey: readonly unknown[] = event.query.queryKey;
        if (
          eventKey[0] === queryKey[0] ||
          (searchQueryKey && eventKey[0] === searchQueryKey[0]) ||
          (eventKey[0] === BOOKMARKS_KEY && eventKey[1] === String(bookmarkId))
        ) {
          // oxlint-disable-next-line promise/prefer-await-to-callbacks
          callback();
        }
      }),
    [queryClient, queryKey, searchQueryKey, bookmarkId],
  );

  // Get current relation IDs from cache with stable reference
  const getSnapshot = useCallback((): number[] => {
    let result: number[] = [];

    // Query key for single bookmark fetched via useFetchBookmarkById
    const singleBookmarkKey = [BOOKMARKS_KEY, String(bookmarkId)] as const;

    // Try primary query
    const primaryData = queryClient.getQueryData<PaginatedBookmarks>(queryKey);
    for (const page of primaryData?.pages ?? []) {
      const bookmark = page.find((bm) => bm.id === bookmarkId);
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
      const searchData = queryClient.getQueryData<PaginatedBookmarks>(searchQueryKey);
      for (const page of searchData?.pages ?? []) {
        const bookmark = page.find((bm) => bm.id === bookmarkId);
        if (bookmark) {
          result = extractFn(bookmark);
          if (filterFn) {
            result = result.filter(filterFn);
          }

          break;
        }
      }
    }

    // Fallback: check single bookmark cache (from useFetchBookmarkById)
    // This handles the case when lightbox is opened via direct link/preview route
    if (result.length === 0) {
      const singleBookmarkData = queryClient.getQueryData<SingleListData[]>(singleBookmarkKey);
      const bookmark = singleBookmarkData?.[0];
      if (bookmark?.id === bookmarkId) {
        result = extractFn(bookmark);
        if (filterFn) {
          result = result.filter(filterFn);
        }
      }
    }

    // Fallback: similar-page caches ([BOOKMARKS_KEY, userId, "similar", sourceId]).
    // Paginated fetch is disabled on /similar, so the primary/search lookups miss
    // and chip state would otherwise be empty.
    if (result.length === 0) {
      const similarEntries = queryClient.getQueriesData<SingleListData[]>({
        queryKey: [BOOKMARKS_KEY],
      });
      for (const [key, data] of similarEntries) {
        if (key[2] !== SIMILAR_URL) {
          continue;
        }

        const bookmark = data?.find((bm) => bm.id === bookmarkId);
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
    if (cached.length === result.length && cached.every((id, idx) => id === result[idx])) {
      return cached;
    }

    // Update cache and return new reference
    cachedRef.current = result;
    return result;
  }, [queryClient, queryKey, searchQueryKey, bookmarkId, extractFn, filterFn]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
