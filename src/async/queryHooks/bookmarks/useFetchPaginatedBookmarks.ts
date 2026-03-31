import { useEffect, useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { flatten } from "lodash";

import type { SupabaseSessionType } from "../../../types/apiTypes";
import type { BookmarksSortByTypes } from "../../../types/componentStoreTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useLoadersStore, useSupabaseSession } from "../../../store/componentStore";
import { isNonNullable } from "../../../utils/assertion-utils";
import { BOOKMARKS_KEY, DISCOVER_URL, PAGINATION_LIMIT } from "../../../utils/constants";
import { fetchBookmarksData } from "../../supabaseCrudHelpers";

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
    isFetching: isFetchingEverythingData,
    isLoading: isEverythingDataLoading,
    /* oxlint-disable @tanstack/query/exhaustive-deps -- session?.user?.id is the cache-relevant part, full session would over-refetch */
  } = useInfiniteQuery({
    enabled: enabled && CATEGORY_ID !== DISCOVER_URL,
    queryFn: (data) =>
      fetchBookmarksData(data, session as SupabaseSessionType, sortBy as BookmarksSortByTypes),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, pages) => pages.length * PAGINATION_LIMIT,
    queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
  });
  /* oxlint-enable @tanstack/query/exhaustive-deps */

  useEffect(() => {
    if (everythingData && isSortByLoading) {
      toggleIsSortByLoading();
    }
  }, [isSortByLoading, everythingData, toggleIsSortByLoading]);

  // Flatten paginated data reactively - this updates when cache changes
  const flattendPaginationBookmarkData = useMemo(
    () => flatten(everythingData?.pages?.map((page) => page?.data)).filter(isNonNullable),
    [everythingData],
  );

  return {
    everythingData,
    fetchNextPage,
    flattendPaginationBookmarkData,
    isEverythingDataLoading,
    isFetchingEverythingData,
  };
}
