import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchDiscoverBookmarks } from "@/async/supabaseCrudHelpers";
import {
	BOOKMARKS_KEY,
	DISCOVER_URL,
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
		queryFn: fetchDiscoverBookmarks,
		initialPageParam: 0,
		getNextPageParam: (lastPage, pages) => {
			const lastPageLength = lastPage?.data?.length ?? 0;

			if (lastPageLength < PAGINATION_LIMIT) {
				return undefined;
			}

			return pages.length * PAGINATION_LIMIT;
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
