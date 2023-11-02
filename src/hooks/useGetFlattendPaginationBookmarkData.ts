import { useSession } from "@supabase/auth-helpers-react";
import { useQueryClient } from "@tanstack/react-query";
import { flatten } from "lodash";

import { type SingleListData } from "../types/apiTypes";
import { BOOKMARKS_KEY } from "../utils/constants";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

export default function useGetFlattendPaginationBookmarkData() {
	const session = useSession();
	const queryClient = useQueryClient();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const allBookmarksData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		categoryId,
	]) as {
		pages: Array<{
			data: SingleListData[];
		}>;
	};

	const flattendPaginationBookmarkData = flatten(
		allBookmarksData?.pages?.map((item) =>
			item?.data?.map((twoItem) => twoItem),
		),
	) as SingleListData[];

	return { flattendPaginationBookmarkData };
}
