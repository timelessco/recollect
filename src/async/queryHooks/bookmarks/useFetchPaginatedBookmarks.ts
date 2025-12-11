import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type SupabaseSessionType } from "../../../types/apiTypes";
import { type BookmarksSortByTypes } from "../../../types/componentStoreTypes";
import { BOOKMARKS_KEY, PAGINATION_LIMIT } from "../../../utils/constants";
import { fetchBookmarksData } from "../../supabaseCrudHelpers";

// fetches paginated bookmarks pages on user location like everything or categories etc...
export default function useFetchPaginatedBookmarks() {
	const session = useSupabaseSession((state) => state.session);

	const isSortByLoading = useLoadersStore((state) => state.isSortByLoading);
	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { sortBy } = useGetSortBy();

	const {
		data: everythingData,
		fetchNextPage,
		isLoading: isEverythingDataLoading,
		isFetching: isFetchingEverythingData,
	} = useInfiniteQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
		// eslint-disable-next-line @tanstack/query/no-void-query-fn
		queryFn: async (data) =>
			await fetchBookmarksData(
				data,
				session as SupabaseSessionType,
				sortBy as BookmarksSortByTypes,
			),
		initialPageParam: 0,
		getNextPageParam: (_lastPage, pages) => pages.length * PAGINATION_LIMIT,
	});

	useEffect(() => {
		if (everythingData && isSortByLoading) {
			toggleIsSortByLoading();
		}
	}, [isSortByLoading, everythingData, toggleIsSortByLoading]);

	return {
		everythingData,
		fetchNextPage,
		isEverythingDataLoading,
		isFetchingEverythingData,
	};
}
