import { useQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { BOOKMARKS_KEY, V2_FETCH_BOOKMARK_BY_ID_API } from "@/utils/constants";

interface UseFetchBookmarkByIdOptions {
  enabled?: boolean;
}

export const useFetchBookmarkById = (id: string, options?: UseFetchBookmarkByIdOptions) => {
  const { enabled = true } = options ?? {};

  return useQuery({
    enabled: enabled && Boolean(id),
    queryFn: () =>
      api.get(V2_FETCH_BOOKMARK_BY_ID_API, { searchParams: { id } }).json<SingleListData[]>(),
    queryKey: [BOOKMARKS_KEY, id],
  });
};
