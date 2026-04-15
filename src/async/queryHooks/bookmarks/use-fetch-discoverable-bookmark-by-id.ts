import { useQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { getApi } from "@/lib/api-helpers/api";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API,
  NEXT_API_URL,
} from "@/utils/constants";

export const useFetchDiscoverableBookmarkById = (
  id: number | string,
  options?: { enabled?: boolean },
) => {
  const {
    data: bookmark,
    error,
    isLoading,
  } = useQuery({
    enabled: options?.enabled ?? Boolean(id),
    queryFn: async () => {
      const data = await getApi<SingleListData>(
        `${NEXT_API_URL}${FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API}?id=${id}`,
      );
      return data;
    },
    queryKey: [BOOKMARKS_KEY, DISCOVER_URL, id],
  });

  return {
    bookmark,
    error,
    isLoading,
  };
};
