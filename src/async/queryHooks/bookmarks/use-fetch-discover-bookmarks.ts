import { useMemo } from "react";
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

type UseFetchDiscoverBookmarksProps = {
	enabled?: boolean;
	initialData?: SingleListData[];
};

export const useFetchDiscoverBookmarks = (
	options: UseFetchDiscoverBookmarksProps = {},
) => {
	const { enabled = true, initialData } = options;

	const {
		data: discoverData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useInfiniteQuery({
		queryKey: [BOOKMARKS_KEY, DISCOVER_URL],
		enabled,
		queryFn: async ({ pageParam }) => {
			const data = await getApi<SingleListData[]>(
				`${NEXT_API_URL}${FETCH_BOOKMARKS_DISCOVERABLE_API}?page=${pageParam}`,
			);
			return { data };
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, pages) => {
			const lastPageLength = lastPage?.data?.length ?? 0;

			if (lastPageLength < PAGINATION_LIMIT) {
				return undefined;
			}

			return pages.length;
		},
		...(initialData !== undefined && {
			initialData: {
				pages: [{ data: initialData }],
				pageParams: [0],
			},
			staleTime: 60_000,
		}),
	});

	const flattenedData = useMemo(
		() =>
			(discoverData?.pages?.flatMap((page) => page?.data ?? []) ??
				[]) as SingleListData[],
		[discoverData],
	);

	return {
		discoverData,
		flattenedData,
		fetchNextPage,
		hasNextPage: hasNextPage ?? false,
		isFetchingNextPage,
		isLoading,
	};
};
