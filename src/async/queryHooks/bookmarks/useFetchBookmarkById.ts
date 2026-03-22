import { useQuery } from "@tanstack/react-query";

import type { SingleListData } from "../../../types/apiTypes";

import { BOOKMARKS_KEY } from "../../../utils/constants";
import { fetchBookmarkById } from "../../supabaseCrudHelpers";

interface BookmarkResponse {
  data: SingleListData;
}

interface UseFetchBookmarkByIdOptions {
  enabled?: boolean;
}

export const useFetchBookmarkById = (id: string, options?: UseFetchBookmarkByIdOptions) => {
  const { enabled = true } = options ?? {};

  return useQuery<BookmarkResponse>({
    enabled: enabled && Boolean(id),
    queryFn: async () => (await fetchBookmarkById(id)) as BookmarkResponse,
    queryKey: [BOOKMARKS_KEY, id],
  });
};
