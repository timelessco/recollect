import { useEffect, useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { isEmpty } from "lodash";

import type { SingleListData } from "@/types/apiTypes";

import { buildSearchCategorySegment } from "@/hooks/use-bookmark-mutation-context";
import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { api } from "@/lib/api-helpers/api-v2";
import { useLoadersStore, useMiscellaneousStore, useSupabaseSession } from "@/store/componentStore";
import { isNonNullable } from "@/utils/assertion-utils";
import { BOOKMARKS_KEY, PAGINATION_LIMIT, V2_SEARCH_BOOKMARKS_API } from "@/utils/constants";

interface UseSearchBookmarksOptions {
  enabled?: boolean;
}

// searches bookmarks
export default function useSearchBookmarks(options: UseSearchBookmarksOptions = {}) {
  const { enabled = true } = options;
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const session = useSupabaseSession((state) => state.session);
  const toggleIsSearchLoading = useLoadersStore((state) => state.toggleIsSearchLoading);

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    enabled: enabled && !isEmpty(searchText),
    queryFn: ({ pageParam }) =>
      api
        .get(V2_SEARCH_BOOKMARKS_API, {
          searchParams: {
            category_id: String(CATEGORY_ID ?? "null"),
            offset: pageParam,
            search: searchText ?? "",
          },
        })
        .json<SingleListData[]>(),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage || lastPage.length < PAGINATION_LIMIT) {
        return;
      }

      return pages.length * PAGINATION_LIMIT;
    },
    queryKey: [
      BOOKMARKS_KEY,
      session?.user?.id,
      buildSearchCategorySegment(CATEGORY_ID),
      searchText,
    ] as const,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isEmpty(searchText)) {
      toggleIsSearchLoading(isLoading);
    } else {
      toggleIsSearchLoading(false);
    }
  }, [toggleIsSearchLoading, isLoading, searchText]);

  return {
    data,
    fetchNextPage,
    flattenedSearchData: useMemo(() => data?.pages?.flat().filter(isNonNullable) ?? [], [data]),
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
}
