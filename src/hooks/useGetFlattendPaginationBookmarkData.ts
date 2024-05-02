import { useSession } from "@supabase/auth-helpers-react";
import { useQueryClient } from "@tanstack/react-query";
import { flatten } from "lodash";

import { useSupabaseSession } from "../store/componentStore";
import { type SingleListData } from "../types/apiTypes";
import { BOOKMARKS_KEY } from "../utils/constants";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";
import useGetSortBy from "./useGetSortBy";

export default function useGetFlattendPaginationBookmarkData() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const { sortBy } = useGetSortBy();

	const allBookmarksData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		categoryId,
		sortBy,
	]) as {
		pages: Array<{
			data: SingleListData[];
		}>;
	};

	const flattendPaginationBookmarkData = flatten(
		allBookmarksData?.pages?.map(
			(item) => item?.data?.map((twoItem) => twoItem),
		),
	) as SingleListData[];

	return { flattendPaginationBookmarkData };
}
