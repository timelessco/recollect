import { useEffect } from "react";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { find, isEmpty } from "lodash";

import type {
  CategoriesData,
  FetchSharedCategoriesData,
  SingleListData,
} from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import {
  useLoadersStore,
  useMiscellaneousStore,
  useSupabaseSession,
} from "../../../store/componentStore";
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  PAGINATION_LIMIT,
  SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { searchSlugKey } from "../../../utils/helpers";
import { searchBookmarks } from "../../supabaseCrudHelpers";

interface UseSearchBookmarksOptions {
  enabled?: boolean;
}

// searches bookmarks
export default function useSearchBookmarks(options: UseSearchBookmarksOptions = {}) {
  const { enabled = true } = options;
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const session = useSupabaseSession((state) => state.session);
  const toggleIsSearchLoading = useLoadersStore((state) => state.toggleIsSearchLoading);

  const queryClient = useQueryClient();

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const categoryData = queryClient.getQueryData<{ data: CategoriesData[] }>([
    CATEGORIES_KEY,
    session?.user?.id,
  ]);

  const sharedCategoriesData = queryClient.getQueryData<{ data: FetchSharedCategoriesData[] }>([
    SHARED_CATEGORIES_TABLE_NAME,
  ]);

  // this tells if the collection is a shared collection or not
  const isSharedCategory = Boolean(
    find(sharedCategoriesData?.data, (item) => item?.category_id === CATEGORY_ID),
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    enabled: enabled && !isEmpty(searchText),
    queryFn: async ({ pageParam: pageParameter }) => {
      if (searchText) {
        const result = await searchBookmarks(
          searchText,
          CATEGORY_ID,
          isSharedCategory,
          pageParameter,
          PAGINATION_LIMIT,
        );
        return result;
      }

      return { data: [], error: null };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      // If last page has fewer results than limit, no more pages
      if (!lastPage?.data || lastPage.data.length < PAGINATION_LIMIT) {
        return;
      }

      // Return offset for next page
      return pages.length * PAGINATION_LIMIT;
    },
    // eslint-disable @tanstack/query/exhaustive-deps -- CATEGORY_ID and isSharedCategory are derived from categoryData; key must match cardSection's getQueryData lookup
    queryKey: [
      BOOKMARKS_KEY,
      session?.user?.id,
      categoryData ? searchSlugKey(categoryData) : undefined,
      searchText,
    ] as const,
    refetchOnWindowFocus: false,
    // Remove initialPageParam completely
  });

  useEffect(() => {
    if (!isEmpty(searchText)) {
      toggleIsSearchLoading(isLoading);
    } else {
      toggleIsSearchLoading(false);
    }
  }, [toggleIsSearchLoading, isLoading, searchText]);

  // Flatten the search results to match the expected data structure
  return {
    data,
    fetchNextPage,
    flattenedSearchData: (data?.pages?.flatMap((page) => page?.data ?? []) ??
      []) as unknown as SingleListData[],
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
}
