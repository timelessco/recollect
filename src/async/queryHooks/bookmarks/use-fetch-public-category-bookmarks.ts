import { useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { GetPublicCategoryBookmarksApiResponseType } from "@/types/apiTypes";

import {
  FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
  getBaseUrl,
  NEXT_API_URL,
  PAGINATION_LIMIT,
  PUBLIC_BOOKMARKS_KEY,
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
        const response = await fetch(
          `${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${categorySlug}&user_name=${userName}&page=${pageParam}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as GetPublicCategoryBookmarksApiResponseType;

        if (result.error) {
          throw new Error(
            typeof result.error === "string" ? result.error : "Failed to fetch bookmarks",
          );
        }

        return result;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const lastPageLength = lastPage?.data?.length ?? 0;
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
    () => data?.pages?.flatMap((page) => page?.data ?? []) ?? [],
    [data],
  );

  // Get metadata from the first page
  const metadata = useMemo(
    () => ({
      categoryName: data?.pages?.[0]?.category_name ?? null,
      categoryViews: data?.pages?.[0]?.category_views ?? null,
      icon: data?.pages?.[0]?.icon ?? null,
      iconColor: data?.pages?.[0]?.icon_color ?? null,
      isPublic: data?.pages?.[0]?.is_public ?? null,
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
