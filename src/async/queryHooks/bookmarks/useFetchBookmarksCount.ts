import { useQuery } from "@tanstack/react-query";

import type { BookmarksCountTypes } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_COUNT_KEY } from "../../../utils/constants";
import { getBookmarksCount } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchBookmarksCount() {
  const session = useSupabaseSession((state) => state.session);

  /* oxlint-disable @tanstack/query/exhaustive-deps -- session?.user?.id is the cache-relevant part, full session would over-refetch */
  const { data: bookmarksCountData } = useQuery<{
    data: BookmarksCountTypes | null;
    error: Error;
  }>({
    queryFn: (data) =>
      // @ts-expect-error - Todo fix this
      getBookmarksCount(data, session ?? { user: null }),
    queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
  });
  /* oxlint-enable @tanstack/query/exhaustive-deps */

  return {
    bookmarksCountData,
  };
}
