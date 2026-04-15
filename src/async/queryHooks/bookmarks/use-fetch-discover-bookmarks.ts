import { useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { getApi } from "@/lib/api-helpers/api";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  FETCH_BOOKMARKS_DISCOVERABLE_API,
  NEXT_API_URL,
  PAGINATION_LIMIT,
} from "@/utils/constants";

interface UseFetchDiscoverBookmarksProps {
  enabled?: boolean;
  initialData?: SingleListData[];
}

export const useFetchDiscoverBookmarks = (options: UseFetchDiscoverBookmarksProps = {}) => {
  const { enabled = true, initialData } = options;

  const {
    data: discoverData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    enabled,
    queryFn: async ({ pageParam }) => {
      const data = await getApi<SingleListData[]>(
        `${NEXT_API_URL}${FETCH_BOOKMARKS_DISCOVERABLE_API}?page=${pageParam}`,
      );
      return { data };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const lastPageLength = lastPage?.data?.length ?? 0;
      return lastPageLength < PAGINATION_LIMIT ? undefined : pages.length;
    },
    queryKey: [BOOKMARKS_KEY, DISCOVER_URL],
    ...(initialData !== undefined && {
      initialData: {
        pageParams: [0],
        pages: [{ data: initialData }],
      },
      staleTime: 60_000,
    }),
  });

  const flattenedData = useMemo(
    () => discoverData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
    [discoverData],
  );

  return {
    discoverData,
    fetchNextPage,
    flattenedData,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
};
