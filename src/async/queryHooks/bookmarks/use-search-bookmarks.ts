import { useEffect, useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { isEmpty } from "lodash";

import type { SearchPage, SingleListData } from "@/types/apiTypes";

import { buildSearchCategorySegment } from "@/hooks/use-bookmark-mutation-context";
import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { api } from "@/lib/api-helpers/api-v2";
import { useLoadersStore, useMiscellaneousStore, useSupabaseSession } from "@/store/componentStore";
import { isNonNullable } from "@/utils/assertion-utils";
import { BOOKMARKS_KEY, V2_SEARCH_BOOKMARKS_API } from "@/utils/constants";

interface UseSearchBookmarksOptions {
  enabled?: boolean;
}

// searches bookmarks via two-phase cursor pagination (tag → color)
export default function useSearchBookmarks(options: UseSearchBookmarksOptions = {}) {
  const { enabled = true } = options;
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const session = useSupabaseSession((state) => state.session);
  const toggleIsSearchLoading = useLoadersStore((state) => state.toggleIsSearchLoading);

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    enabled: enabled && !isEmpty(searchText),
    queryFn: async ({ pageParam }) => {
      const response = await api
        .get(V2_SEARCH_BOOKMARKS_API, {
          searchParams: {
            category_id: String(CATEGORY_ID ?? "null"),
            cursor: pageParam,
            search: searchText ?? "",
          },
        })
        .json<{ items: SingleListData[]; next_cursor: null | string }>();
      const page: SearchPage = {
        items: response.items,
        next_cursor: response.next_cursor,
      };
      return page;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
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
    flattenedSearchData: useMemo(
      () => data?.pages?.flatMap((p) => p.items).filter(isNonNullable) ?? [],
      [data],
    ),
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
}
