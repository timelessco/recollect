import { useSession } from "@supabase/auth-helpers-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useLoadersStore } from "../../../store/componentStore";
import { type BookmarksSortByTypes } from "../../../types/componentStoreTypes";
import { BOOKMARKS_KEY, PAGINATION_LIMIT } from "../../../utils/constants";
import { fetchBookmakrsData } from "../../supabaseCrudHelpers";

// fetches paginated bookmarks pages on user location like all-bookmarks or categories etc...
export default function useFetchPaginatedBookmarks() {
	const session = useSession();
	const isSortByLoading = useLoadersStore((state) => state.isSortByLoading);
	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { sortBy } = useGetSortBy();

	const {
		data: allBookmarksData,
		fetchNextPage,
		isLoading: isAllBookmarksDataLoading,
	} = useInfiniteQuery({
		queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
		queryFn: async (data) =>
			await fetchBookmakrsData(data, session, sortBy as BookmarksSortByTypes),
		getNextPageParam: (_lastPage, pages) => pages.length * PAGINATION_LIMIT,
		onSettled: () => {
			if (isSortByLoading === true) {
				toggleIsSortByLoading();
			}
		},
	});

	return {
		allBookmarksData,
		fetchNextPage,
		isAllBookmarksDataLoading,
	};
}
