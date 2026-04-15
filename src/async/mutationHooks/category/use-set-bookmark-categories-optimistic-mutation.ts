import { produce } from "immer";

import type {
  SetBookmarkCategoriesPayload,
  SetBookmarkCategoriesResponse,
} from "@/app/api/category/set-bookmark-categories/schema";
import type { CategoriesData, PaginatedBookmarks } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  SET_BOOKMARK_CATEGORIES_API,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/utils/constants";

interface SetBookmarkCategoriesMutationOptions {
  preserveInList?: boolean;
  skipInvalidation?: boolean;
}

/**
 * Mutation hook for setting all categories for a bookmark.
 * Replaces existing categories with the new set.
 */
export function useSetBookmarkCategoriesOptimisticMutation({
  preserveInList = false,
  skipInvalidation = false,
}: SetBookmarkCategoriesMutationOptions = {}) {
  const { CATEGORY_ID, queryClient, queryKey, searchQueryKey, session } =
    useBookmarkMutationContext();

  const setBookmarkCategoriesOptimisticMutation = useReactQueryOptimisticMutation<
    SetBookmarkCategoriesResponse,
    Error,
    SetBookmarkCategoriesPayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    mutationFn: (payload) =>
      postApi<SetBookmarkCategoriesResponse>(`/api${SET_BOOKMARK_CATEGORIES_API}`, payload),
    onSettled: (_data, error) => {
      if (error) {
        return;
      }

      if (skipInvalidation) {
        return;
      }

      // Invalidate bookmark counts
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });

      // Invalidate ALL bookmark queries for user (covers all collections)
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
    },
    queryKey,
    secondaryQueryKey: searchQueryKey,
    showSuccessToast: true,
    skipSecondaryInvalidation: skipInvalidation,
    successMessage: "Collection updated",
    updater: (currentData, variables) => {
      if (!currentData?.pages) {
        return currentData!;
      }

      // Resolve categories from cache - skip optimistic update if not found
      const allCategories =
        queryClient.getQueryData<CategoriesData[]>([CATEGORIES_KEY, session?.user?.id]) ?? [];

      // EXCLUSIVE MODEL: Filter out 0 from input (users cannot manually assign to 0)
      const nonZeroCategoryIds = variables.category_ids.filter(
        (id) => id !== UNCATEGORIZED_CATEGORY_ID,
      );

      // Determine final category IDs based on exclusive model
      // Empty = only uncategorized, Non-empty = only real categories
      const finalCategoryIds =
        nonZeroCategoryIds.length === 0 ? [UNCATEGORIZED_CATEGORY_ID] : nonZeroCategoryIds;

      // Filter to only categories that exist in cache
      const newCategories = finalCategoryIds
        .map((id) => allCategories.find((cat) => cat.id === id))
        .filter((cat): cat is CategoriesData => cat !== undefined);

      // If any categories weren't in cache, skip optimistic update and wait for server
      if (newCategories.length !== finalCategoryIds.length) {
        const missingCategoryIds = finalCategoryIds.filter(
          (id) => !newCategories.some((cat) => cat.id === id),
        );
        logCacheMiss("Optimistic Update", "Categories not found in cache", {
          bookmarkId: variables.bookmark_id,
          missingCategoryIds,
          requestedCategoryIds: finalCategoryIds,
        });
        return currentData;
      }

      // Check if new categories include current collection
      const includesCurrentCollection =
        typeof CATEGORY_ID === "number" && variables.category_ids.includes(CATEGORY_ID);
      const shouldRemoveFromList = !includesCurrentCollection && !preserveInList;

      return produce(currentData, (draft) => {
        for (const page of draft.pages) {
          if (!page) {
            continue;
          }

          const bookmarkIndex = page.findIndex((b) => b.id === variables.bookmark_id);
          if (bookmarkIndex === -1) {
            continue;
          }

          // Remove bookmark from list if current collection is removed
          if (shouldRemoveFromList) {
            page.splice(bookmarkIndex, 1);
            return;
          }

          // Update categories
          page[bookmarkIndex].addedCategories = newCategories;
          return;
        }
      });
    },
  });

  return { setBookmarkCategoriesOptimisticMutation };
}
