import { useRouter } from "next/router";
import { useEffect } from "react";

import { isEmpty } from "lodash";

import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/use-fetch-discover-bookmarks";
import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import useSearchBookmarks from "@/async/queryHooks/bookmarks/use-search-bookmarks";
import { useMiscellaneousStore } from "@/store/componentStore";
import { DISCOVER_URL, isPublicPath, PAGINATION_LIMIT } from "@/utils/constants";
import { useHandleClientError } from "@/utils/error-utils/client";
import { getCategorySlugFromRouter } from "@/utils/url";

interface UseLightboxPrefetchParams {
  activeIndex: number;
  bookmarksLength: number;
  open: boolean;
  pages: unknown[][] | undefined;
}

/**
 * Hook to prefetch the next page of bookmarks when approaching the end of current data
 * in the lightbox view.
 */
export function useLightboxPrefetch({
  activeIndex,
  bookmarksLength,
  open,
  pages,
}: UseLightboxPrefetchParams) {
  const router = useRouter();
  const isPublicPage = isPublicPath(router.asPath);
  const categorySlug = getCategorySlugFromRouter(router);
  const isDiscoverPage = categorySlug === DISCOVER_URL;

  const fetchesEnabled = !isPublicPage;

  const { fetchNextPage: fetchNextBookmarkPage } = useFetchPaginatedBookmarks();
  const { fetchNextPage: fetchNextSearchPage, hasNextPage: searchHasNextPage } =
    useSearchBookmarks();
  const { fetchNextPage: fetchNextDiscoverPage, hasNextPage: discoverHasNextPage } =
    useFetchDiscoverBookmarks({
      enabled: fetchesEnabled && isDiscoverPage,
    });

  const handleClientError = useHandleClientError();

  // Determine if we're currently searching
  const searchText = useMiscellaneousStore((state) => state.searchText);

  const isSearching = !isEmpty(searchText);
  const threshold = 3;
  const shouldFetchMore = activeIndex >= bookmarksLength - threshold;

  const currentPageCount = pages?.length ?? 0;
  const lastPageItemCount = pages?.[currentPageCount - 1]?.length ?? 0;
  const hasMoreData = lastPageItemCount >= PAGINATION_LIMIT;

  useEffect(() => {
    if (!open || activeIndex === -1 || !bookmarksLength) {
      return;
    }

    if (shouldFetchMore && hasMoreData) {
      const prefetch = async () => {
        try {
          if (isDiscoverPage) {
            if (isSearching && searchHasNextPage) {
              await fetchNextSearchPage();
            } else if (!isSearching && discoverHasNextPage) {
              await fetchNextDiscoverPage();
            }
          } else if (isSearching && searchHasNextPage) {
            await fetchNextSearchPage();
          } else if (!isSearching) {
            await fetchNextBookmarkPage();
          }
        } catch (error) {
          handleClientError(error, "Error prefetching next page");
        }
      };

      void prefetch();
    }
  }, [
    activeIndex,
    bookmarksLength,
    open,
    pages,
    isSearching,
    isDiscoverPage,
    searchHasNextPage,
    discoverHasNextPage,
    fetchNextSearchPage,
    fetchNextBookmarkPage,
    fetchNextDiscoverPage,
    shouldFetchMore,
    hasMoreData,
    handleClientError,
  ]);
}
