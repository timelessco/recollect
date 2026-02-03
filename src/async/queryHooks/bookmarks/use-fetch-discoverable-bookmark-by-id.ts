import { useQuery } from "@tanstack/react-query";

import { getApi } from "@/lib/api-helpers/api";
import { type SingleListData } from "@/types/apiTypes";
import {
	BOOKMARKS_KEY,
	DISCOVER_URL,
	FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API,
	NEXT_API_URL,
} from "@/utils/constants";

export const useFetchDiscoverableBookmarkById = (
	id: string | number,
	options?: { enabled?: boolean },
) => {
	const {
		data: bookmark,
		isLoading,
		error,
	} = useQuery({
		queryKey: [BOOKMARKS_KEY, DISCOVER_URL, id],
		queryFn: async () => {
			const data = await getApi<SingleListData>(
				`${NEXT_API_URL}${FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API}?id=${id}`,
			);
			return data;
		},
		enabled: options?.enabled ?? Boolean(id),
	});

	return {
		bookmark,
		error,
		isLoading,
	};
};
