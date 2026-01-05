import { useEffect } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { find, isEmpty } from "lodash";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type FetchSharedCategoriesData,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_KEY,
	PAGINATION_LIMIT,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { searchBookmarks } from "../../supabaseCrudHelpers";

// searches bookmarks
export default function useSearchBookmarks() {
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const session = useSupabaseSession((state) => state.session);
	const toggleIsSearchLoading = useLoadersStore(
		(state) => state.toggleIsSearchLoading,
	);

	const queryClient = useQueryClient();

	const debouncedSearch = useDebounce(searchText, 500);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	// this tells if the collection is a shared collection or not
	const isSharedCategory = Boolean(
		find(
			sharedCategoriesData?.data,
			(item) => item?.category_id === CATEGORY_ID,
		),
	);

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: [
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				debouncedSearch,
			] as const,
			enabled: !isEmpty(debouncedSearch),
			refetchOnWindowFocus: false,
			initialPageParam: 0,
			queryFn: async ({ pageParam: pageParameter }) => {
				if (debouncedSearch) {
					const result = await searchBookmarks(
						debouncedSearch,
						CATEGORY_ID,
						isSharedCategory,
						pageParameter,
						PAGINATION_LIMIT,
					);
					return result;
				}

				return { data: [], error: null };
			},
			getNextPageParam: (lastPage, pages) => {
				// If last page has fewer results than limit, no more pages
				if (!lastPage?.data || lastPage.data.length < PAGINATION_LIMIT) {
					return undefined;
				}

				// Return offset for next page
				return pages.length * PAGINATION_LIMIT;
			},
			// Remove initialPageParam completely
		});

	useEffect(() => {
		if (!isEmpty(debouncedSearch)) {
			toggleIsSearchLoading(isLoading);
		} else {
			toggleIsSearchLoading(false);
		}
	}, [toggleIsSearchLoading, isLoading, debouncedSearch]);

	// Flatten the search results to match the expected data structure
	return {
		data,
		flattenedSearchData: (data?.pages?.flatMap((page) => page?.data ?? []) ??
			[]) as unknown as SingleListData[],
		isLoading,
		fetchNextPage,
		hasNextPage: hasNextPage ?? false,
		isFetchingNextPage,
	};
}
