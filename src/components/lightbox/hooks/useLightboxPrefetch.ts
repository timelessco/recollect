import { useEffect } from "react";
import { useRouter } from "next/router";
import { isEmpty } from "lodash";

import { useFetchDiscoverBookmarks } from "@/async/queryHooks/bookmarks/useFetchDiscoverBookmarks";
import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "@/async/queryHooks/bookmarks/useSearchBookmarks";
import { useMiscellaneousStore } from "@/store/componentStore";
import { DISCOVER_URL, PAGINATION_LIMIT } from "@/utils/constants";
import { handleClientError } from "@/utils/error-utils/client";
import { getCategorySlugFromRouter } from "@/utils/url";

type UseLightboxPrefetchParams = {
	activeIndex: number;
	bookmarksLength: number;
	open: boolean;
	pages: Array<{ data: unknown[] }> | undefined;
};

/**
 * Hook to prefetch the next page of bookmarks when approaching the end of current data
 * in the lightbox view.
 */
export function useLightboxPrefetch({
	open,
	activeIndex,
	bookmarksLength,
	pages,
}: UseLightboxPrefetchParams) {
	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);
	const isDiscoverPage = categorySlug === DISCOVER_URL;

	const { fetchNextPage: fetchNextBookmarkPage } = useFetchPaginatedBookmarks();
	const { fetchNextPage: fetchNextSearchPage, hasNextPage: searchHasNextPage } =
		useSearchBookmarks();
	const {
		fetchNextPage: fetchNextDiscoverPage,
		hasNextPage: discoverHasNextPage,
	} = useFetchDiscoverBookmarks();

	// Determine if we're currently searching
	const searchText = useMiscellaneousStore((state) => state.searchText);

	const isSearching = !isEmpty(searchText);
	const threshold = 3;
	const shouldFetchMore = activeIndex >= bookmarksLength - threshold;

	const currentPageCount = pages?.length ?? 0;
	const lastPageItemCount = pages?.[currentPageCount - 1]?.data?.length ?? 0;
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
	]);
}
