import { produce } from "immer";

import type {
  MoveBookmarkToTrashApiPayload,
  PaginatedBookmarks,
  PaginatedSearch,
} from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from "@/utils/constants";

import { moveBookmarkToTrash } from "../../supabaseCrudHelpers";

/**
 * Mutation hook for moving bookmarks to/from trash with optimistic updates.
 * Handles:
 * - Removing bookmark from source page (current category or trash)
 * - Adding bookmark to destination page (trash or category)
 * - Updating the search results cache (SearchPage envelope shape) when actively searching
 * - Proper invalidation of all affected caches including trash page with sortBy
 */
export const useMoveBookmarkToTrashOptimisticMutation = () => {
  const { queryClient, queryKey, searchQueryKey, session, sortBy } = useBookmarkMutationContext();

  const moveBookmarkToTrashOptimisticMutation = useReactQueryOptimisticMutation<
    unknown,
    Error,
    MoveBookmarkToTrashApiPayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    additionalOptimisticUpdates: [
      // Destination cache: trash page when moving TO trash, or category page when restoring
      {
        getQueryKey: (variables) => {
          if (variables.isTrash) {
            return [BOOKMARKS_KEY, session?.user?.id, TRASH_URL, sortBy];
          }
          const [firstBookmark] = variables.data;
          const categoryIds = firstBookmark?.addedCategories?.map((cat) => cat.id) ?? [];
          const targetCategoryId = categoryIds.length > 0 ? categoryIds[0] : UNCATEGORIZED_URL;
          return [BOOKMARKS_KEY, session?.user?.id, targetCategoryId, sortBy];
        },
        updater: (destinationData, variables) => {
          const data = destinationData as PaginatedBookmarks | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return destinationData;
          }
          return produce(data, (draft) => {
            if (draft.pages[0]) {
              const existingIds = new Set(draft.pages[0].map((bookmark) => bookmark.id));
              const newBookmarks = variables.data.filter(
                (bookmark) => !existingIds.has(bookmark.id),
              );
              draft.pages[0].unshift(...newBookmarks);
            }
          });
        },
      },
      // Search cache (SearchPage envelope shape) — only present when actively searching.
      // Removes the moved bookmarks from every page's items array. Leaves next_cursor
      // unchanged; broad invalidation in onSettled refetches with fresh data.
      {
        getQueryKey: () => searchQueryKey,
        updater: (searchData, variables) => {
          const data = searchData as PaginatedSearch | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return searchData;
          }
          const idsToRemove = new Set(variables.data.map((bookmark) => bookmark.id));
          return produce(data, (draft) => {
            for (const page of draft.pages) {
              page.items = page.items.filter((bookmark) => !idsToRemove.has(bookmark.id));
            }
          });
        },
      },
    ],
    mutationFn: moveBookmarkToTrash,
    // Minimal invalidation - only what wasn't optimistically updated
    onSettled: (_data, error, variables) => {
      if (error) {
        return;
      }

      // Always invalidate bookmark counts (needed for sidebar)
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });

      // Broad invalidation prefix-matches both paginated and search caches
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });

      // Invalidate trash page (destination when moving TO trash)
      if (variables.isTrash) {
        void queryClient.invalidateQueries({
          queryKey: [BOOKMARKS_KEY, session?.user?.id, TRASH_URL],
        });
      }
    },

    queryKey,

    showSuccessToast: false,

    // Remove bookmark from source page (current category or trash)
    updater: (currentData, variables) => {
      if (!currentData?.pages) {
        return currentData!;
      }

      const bookmarkIdsToRemove = new Set(variables.data.map((bookmark) => bookmark.id));

      return produce(currentData, (draft) => {
        for (let i = 0; i < draft.pages.length; i += 1) {
          if (!draft.pages[i]) {
            continue;
          }

          draft.pages[i] = draft.pages[i].filter(
            (bookmark) => !bookmarkIdsToRemove.has(bookmark.id),
          );
        }
      });
    },
  });

  return { moveBookmarkToTrashOptimisticMutation };
};
