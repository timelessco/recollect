import { useQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API,
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
      const data = await api
        .get(V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API, {
          searchParams: { id: String(id) },
        })
        .json<SingleListData>();
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
