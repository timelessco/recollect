import { produce } from "immer";

import type {
  ToggleBookmarkDiscoverablePayload,
  ToggleBookmarkDiscoverableResponse,
} from "@/app/api/bookmark/toggle-discoverable-on-bookmark/schema";
import type { PaginatedBookmarks, PaginatedSearch } from "@/types/apiTypes";

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
    additionalOptimisticUpdates: [
      // Search cache (SearchPage envelope shape) — only present when actively searching.
      // Update make_discoverable on the matching bookmark in any page's items array.
      {
        getQueryKey: () => searchQueryKey,
        updater: (searchData, variables) => {
          const data = searchData as PaginatedSearch | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return searchData;
          }
          return produce(data, (draft) => {
            for (const page of draft.pages) {
              for (const bookmark of page.items) {
                if (bookmark.id === variables.bookmark_id) {
                  bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
                }
              }
            }
          });
        },
      },
    ],
    invalidates: [[BOOKMARKS_KEY, DISCOVER_URL], ...(searchQueryKey ? [searchQueryKey] : [])],
    mutationFn: (variables) =>
      postApi<ToggleBookmarkDiscoverableResponse>(
        `${NEXT_API_URL}${TOGGLE_BOOKMARK_DISCOVERABLE_API}`,
        variables,
      ),
    queryKey,
    updater: (currentData, variables) =>
      updateBookmarkInPaginatedData(currentData, variables.bookmark_id, (bookmark) => {
        bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
      })!,
  });

  return { toggleDiscoverableOptimisticMutation };
}
