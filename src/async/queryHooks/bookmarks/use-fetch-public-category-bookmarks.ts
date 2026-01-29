import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import {
	type GetPublicCategoryBookmarksApiResponseType,
	type SingleListData,
} from "@/types/apiTypes";
import {
	FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
	PAGINATION_LIMIT,
} from "@/utils/constants";

type UseFetchPublicCategoryBookmarksProps = {
	categorySlug: string;
	userName: string;
	enabled?: boolean;
	initialData?: GetPublicCategoryBookmarksApiResponseType;
};

export const useFetchPublicCategoryBookmarks = ({
	categorySlug,
	userName,
	enabled = true,
	initialData,
}: UseFetchPublicCategoryBookmarksProps) => {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
	} = useInfiniteQuery({
		queryKey: ["public-bookmarks", categorySlug, userName],
		enabled: enabled && Boolean(categorySlug) && Boolean(userName),
		queryFn: async ({ pageParam }) => {
			const response = await fetch(
				`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${categorySlug}&user_name=${userName}&page=${pageParam}`,
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result =
				(await response.json()) as GetPublicCategoryBookmarksApiResponseType;

			if (result.error) {
				throw new Error(
					typeof result.error === "string"
						? result.error
						: "Failed to fetch bookmarks",
				);
			}

			return result;
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, pages) => {
			const lastPageLength = lastPage?.data?.length ?? 0;

			// If the last page has fewer items than the limit, we've reached the end
			if (lastPageLength < PAGINATION_LIMIT) {
				return undefined;
			}

			// Return the next page number
			return pages.length;
		},
		// Hydrate with SSR data if provided
		...(initialData && {
			initialData: {
				pages: [initialData],
				pageParams: [0],
			},
		}),
	});

	// Flatten paginated data
	const flattenedData = useMemo(
		() =>
			(data?.pages?.flatMap((page) => page?.data ?? []) ??
				[]) as SingleListData[],
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
		flattenedData,
		metadata,
		fetchNextPage,
		hasNextPage: hasNextPage ?? false,
		isFetchingNextPage,
		isLoading,
		error,
	};
};
