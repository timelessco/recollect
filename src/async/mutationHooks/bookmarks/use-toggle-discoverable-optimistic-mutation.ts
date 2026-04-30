import { produce } from "immer";

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
    // The `/discover` grid renders from a separate 2-element cache key
    // (`[BOOKMARKS_KEY, DISCOVER_URL]`) via `useFetchDiscoverBookmarks` —
    // the primary 4-element `queryKey` only hits the dashboard paginated
    // cache. Toggling OFF filters the row out of the list (server uses
    // `.not("make_discoverable", "is", null)`); we mirror that by splicing
    // the bookmark out of every cached page. Toggling ON from `/discover`
    // is a no-op in practice — owned cards on `/discover` are already
    // discoverable, so the EditPopover's switch starts checked.
    additionalOptimisticUpdates: [
      {
        getQueryKey: () => [BOOKMARKS_KEY, DISCOVER_URL],
        updater: (currentData, variables) => {
          const data = currentData as PaginatedBookmarks | undefined;
          if (!data?.pages) {
            return data;
          }

          if (variables.make_discoverable) {
            return (
              updateBookmarkInPaginatedData(data, variables.bookmark_id, (bookmark) => {
                bookmark.make_discoverable = "pending";
              }) ?? data
            );
          }

          return produce(data, (draft) => {
            for (let i = 0; i < draft.pages.length; i += 1) {
              draft.pages[i] = (draft.pages[i] ?? []).filter((b) => b.id !== variables.bookmark_id);
            }
          });
        },
      },
    ],
    // Invalidate the discover list so toggling ON from a dashboard page
    // (/everything, collections) surfaces the newly-discoverable bookmark
    // once the user lands on /discover. The optimistic updater above only
    // *modifies* existing rows; it has no path to *insert* a bookmark that
    // wasn't in the cache before (insert position depends on server sort
    // order). Invalidation marks the cache stale so the next active
    // observer — either the /discover grid remounting on route change, or
    // one already mounted — refetches fresh server state.
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
