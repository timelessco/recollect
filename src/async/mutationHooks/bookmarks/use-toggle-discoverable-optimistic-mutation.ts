import type {
  ToggleBookmarkDiscoverablePayload,
  ToggleBookmarkDiscoverableResponse,
} from "@/app/api/bookmark/toggle-discoverable-on-bookmark/schema";
import type { PaginatedBookmarks } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  NEXT_API_URL,
  TOGGLE_BOOKMARK_DISCOVERABLE_API,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

export function useToggleDiscoverableOptimisticMutation() {
  const { queryKey, searchQueryKey } = useBookmarkMutationContext();

  const toggleDiscoverableOptimisticMutation = useReactQueryOptimisticMutation<
    ToggleBookmarkDiscoverableResponse,
    Error,
    ToggleBookmarkDiscoverablePayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    invalidates: [BOOKMARKS_KEY, DISCOVER_URL],
    mutationFn: (variables) =>
      postApi<ToggleBookmarkDiscoverableResponse>(
        `${NEXT_API_URL}${TOGGLE_BOOKMARK_DISCOVERABLE_API}`,
        variables,
      ),
    queryKey,
    secondaryQueryKey: searchQueryKey,
    updater: (currentData, variables) =>
      updateBookmarkInPaginatedData(currentData, variables.bookmark_id, (bookmark) => {
        bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
      })!,
  });

  return { toggleDiscoverableOptimisticMutation };
}
