import { useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { GetPublicCategoryBookmarksApiResponseType } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import {
  PAGINATION_LIMIT,
  PUBLIC_BOOKMARKS_KEY,
  V2_FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
} from "@/utils/constants";

interface UseFetchPublicCategoryBookmarksProps {
  categorySlug: string;
  enabled?: boolean;
  initialData?: GetPublicCategoryBookmarksApiResponseType;
  userName: string;
}

export const useFetchPublicCategoryBookmarks = ({
  categorySlug,
  enabled = true,
  initialData,
  userName,
}: UseFetchPublicCategoryBookmarksProps) => {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      enabled: enabled && Boolean(categorySlug) && Boolean(userName),
      queryFn: async ({ pageParam }) => {
        const result = await api
          .get(V2_FETCH_PUBLIC_CATEGORY_BOOKMARKS_API, {
            searchParams: {
              category_slug: categorySlug,
              page: String(pageParam),
              user_name: userName,
            },
          })
          .json<GetPublicCategoryBookmarksApiResponseType>();

        return result;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const lastPageLength = lastPage?.bookmarks?.length ?? 0;
        return lastPageLength < PAGINATION_LIMIT ? undefined : pages.length;
      },
      queryKey: [PUBLIC_BOOKMARKS_KEY, categorySlug, userName],
      // Hydrate with SSR data if provided
      ...(initialData && {
        initialData: {
          pageParams: [0],
          pages: [initialData],
        },
      }),
    });

  // Flatten paginated data
  const flattenedData = useMemo(
    () => data?.pages?.flatMap((page) => page?.bookmarks ?? []) ?? [],
    [data],
  );

  // Get metadata from the first page
  const metadata = useMemo(
    () => ({
      categoryName: data?.pages?.[0]?.categoryName ?? null,
      categoryViews: data?.pages?.[0]?.categoryViews ?? null,
      icon: data?.pages?.[0]?.icon ?? null,
      iconColor: data?.pages?.[0]?.iconColor ?? null,
      isPublic: data?.pages?.[0]?.isPublic ?? null,
    }),
    [data],
  );

  return {
    data,
    error,
    fetchNextPage,
    flattenedData,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
    metadata,
  };
};
