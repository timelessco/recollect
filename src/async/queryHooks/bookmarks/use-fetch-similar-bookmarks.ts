import { useQuery } from "@tanstack/react-query";

import type { SingleListData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { BOOKMARKS_KEY, V2_FETCH_SIMILAR_BOOKMARKS_API } from "@/utils/constants";

interface UseFetchSimilarBookmarksOptions {
  enabled?: boolean;
}

export default function useFetchSimilarBookmarks(
  bookmarkId: number | undefined,
  options: UseFetchSimilarBookmarksOptions = {},
) {
  const { enabled = true } = options;
  const session = useSupabaseSession((state) => state.session);
  const userId = session?.user?.id;

  return useQuery({
    enabled: enabled && Boolean(userId) && typeof bookmarkId === "number" && bookmarkId > 0,
    queryFn: async () => {
      const rows = await api
        .get(V2_FETCH_SIMILAR_BOOKMARKS_API, {
          searchParams: { bookmark_id: String(bookmarkId) },
        })
        .json<SingleListData[]>();
      return rows;
    },
    queryKey: [BOOKMARKS_KEY, userId, "similar", bookmarkId],
    staleTime: 60_000,
  });
}
