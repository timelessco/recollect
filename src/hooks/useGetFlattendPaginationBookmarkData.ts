import { useQuery } from "@tanstack/react-query";
import { flatten } from "lodash";

import { useSupabaseSession } from "../store/componentStore";
import { type SingleListData } from "../types/apiTypes";
import { BOOKMARKS_KEY } from "../utils/constants";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";
import useGetSortBy from "./useGetSortBy";

type BookmarksPaginatedData = {
	pages: Array<{
		data: SingleListData[];
	}>;
};

export default function useGetFlattendPaginationBookmarkData() {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const { data: allBookmarksData } = useQuery<BookmarksPaginatedData>({
		queryKey: [BOOKMARKS_KEY, session?.user?.id, categoryId, sortBy],
		enabled: false,
	});

	const flattendPaginationBookmarkData = flatten(
		allBookmarksData?.pages?.map((item) =>
			item?.data?.map((twoItem) => twoItem),
		),
	) as SingleListData[];

	return { flattendPaginationBookmarkData };
}
