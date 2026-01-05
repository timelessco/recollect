import { useInfiniteQuery } from "@tanstack/react-query";

import { getApi } from "@/lib/api-helpers/api";
import { type SingleListData } from "@/types/apiTypes";
import {
	BOOKMARKS_KEY,
	DISCOVER_URL,
	FETCH_BOOKMARKS_DISCOVERABLE_API,
	NEXT_API_URL,
	PAGINATION_LIMIT,
} from "@/utils/constants";

export const useFetchDiscoverBookmarks = () => {
	const {
		data: discoverData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useInfiniteQuery({
		queryKey: [BOOKMARKS_KEY, DISCOVER_URL],
		queryFn: async ({ pageParam }) => {
			const data = await getApi<SingleListData[] | null>(
				`${NEXT_API_URL}${FETCH_BOOKMARKS_DISCOVERABLE_API}?page=${pageParam}`,
			);
			return { data: data ?? [] };
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, pages) => {
			const lastPageLength = lastPage?.data?.length ?? 0;

			if (lastPageLength < PAGINATION_LIMIT) {
				return undefined;
			}

			return pages.length;
		},
	});

	return {
		discoverData,
		fetchNextPage,
		hasNextPage: hasNextPage ?? false,
		isFetchingNextPage,
		isLoading,
	};
};
