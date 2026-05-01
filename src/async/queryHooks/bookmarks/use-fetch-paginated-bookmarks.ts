import { useEffect, useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import useGetSortBy from "@/hooks/useGetSortBy";
import { api } from "@/lib/api-helpers/api-v2";
import { useLoadersStore, useSupabaseSession } from "@/store/componentStore";
import { isNonNullable } from "@/utils/assertion-utils";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  PAGINATION_LIMIT,
  SIMILAR_URL,
  V2_FETCH_BOOKMARKS_DATA_API,
} from "@/utils/constants";

interface UseFetchPaginatedBookmarksOptions {
  enabled?: boolean;
}

// fetches paginated bookmarks pages on user location like everything or categories etc...
export default function useFetchPaginatedBookmarks(
  options: UseFetchPaginatedBookmarksOptions = {},
) {
  const { enabled = true } = options;
  const session = useSupabaseSession((state) => state.session);

  const isSortByLoading = useLoadersStore((state) => state.isSortByLoading);
  const toggleIsSortByLoading = useLoadersStore((state) => state.toggleIsSortByLoading);

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { sortBy } = useGetSortBy();

  const {
    data: everythingData,
    fetchNextPage,
    hasNextPage,
    isFetching: isFetchingEverythingData,
    isLoading: isEverythingDataLoading,
  } = useInfiniteQuery({
    enabled: enabled && CATEGORY_ID !== DISCOVER_URL && CATEGORY_ID !== SIMILAR_URL,
    queryFn: ({ pageParam }) =>
      api
        .get(V2_FETCH_BOOKMARKS_DATA_API, {
          searchParams: {
            category_id: String(CATEGORY_ID ?? "null"),
            from: pageParam,
            ...(sortBy ? { sort_by: sortBy } : {}),
          },
        })
        .json<SingleListData[]>(),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      !lastPage || lastPage.length < PAGINATION_LIMIT ? undefined : pages.length * PAGINATION_LIMIT,
    queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
  });

  useEffect(() => {
    if (everythingData && isSortByLoading) {
      toggleIsSortByLoading();
    }
  }, [isSortByLoading, everythingData, toggleIsSortByLoading]);

  // Flatten paginated data reactively - this updates when cache changes
  const flattendPaginationBookmarkData = useMemo(
    () => everythingData?.pages?.flat().filter(isNonNullable) ?? [],
    [everythingData],
  );

  return {
    everythingData,
    fetchNextPage,
    flattendPaginationBookmarkData,
    hasNextPage,
    isEverythingDataLoading,
    isFetchingEverythingData,
  };
}
