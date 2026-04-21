import { useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  PAGINATION_LIMIT,
  V2_FETCH_BOOKMARKS_DISCOVERABLE_API,
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
      const t0 = performance.now();
      console.log(`[nav-perf] discover queryFn START`, t0.toFixed(0), { page: pageParam });
      const data = await api
        .get(V2_FETCH_BOOKMARKS_DISCOVERABLE_API, {
          searchParams: { page: pageParam },
        })
        .json<SingleListData[]>();
      console.log(`[nav-perf] discover queryFn END`, performance.now().toFixed(0), {
        dtMs: (performance.now() - t0).toFixed(0),
        count: data.length,
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const lastPageLength = lastPage?.length ?? 0;
      return lastPageLength < PAGINATION_LIMIT ? undefined : pages.length;
    },
    queryKey: [BOOKMARKS_KEY, DISCOVER_URL],
    ...(initialData !== undefined && {
      initialData: {
        pageParams: [0],
        pages: [initialData],
      },
      staleTime: 60_000,
    }),
  });

  const flattenedData = useMemo(() => discoverData?.pages?.flat() ?? [], [discoverData]);

  return {
    discoverData,
    fetchNextPage,
    flattenedData,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
};
