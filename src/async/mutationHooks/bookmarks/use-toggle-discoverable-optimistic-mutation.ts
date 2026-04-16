import type {
  ToggleDiscoverableOnBookmarkInput,
  ToggleDiscoverableOnBookmarkOutput,
} from "@/app/api/v2/bookmark/toggle-discoverable-on-bookmark/schema";
import type { PaginatedBookmarks } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  V2_TOGGLE_BOOKMARK_DISCOVERABLE_API,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

export function useToggleDiscoverableOptimisticMutation() {
  const { queryKey, searchQueryKey } = useBookmarkMutationContext();

  const toggleDiscoverableOptimisticMutation = useReactQueryOptimisticMutation<
    ToggleDiscoverableOnBookmarkOutput,
    Error,
    ToggleDiscoverableOnBookmarkInput,
    typeof queryKey,
    PaginatedBookmarks
  >({
    invalidates: [BOOKMARKS_KEY, DISCOVER_URL],
    mutationFn: (variables) =>
      api
        .post(V2_TOGGLE_BOOKMARK_DISCOVERABLE_API, { json: variables })
        .json<ToggleDiscoverableOnBookmarkOutput>(),
    queryKey,
    secondaryQueryKey: searchQueryKey,
    updater: (currentData, variables) =>
      updateBookmarkInPaginatedData(currentData, variables.bookmark_id, (bookmark) => {
        bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
      })!,
  });

  return { toggleDiscoverableOptimisticMutation };
}
