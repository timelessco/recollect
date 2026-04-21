import { useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";

import type { SingleListData } from "@/types/apiTypes";

import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import useSearchBookmarks from "@/async/queryHooks/bookmarks/use-search-bookmarks";
import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import { useSupabaseSession } from "@/store/componentStore";
import { BOOKMARKS_KEY, SIMILAR_URL } from "@/utils/constants";
import { errorToast } from "@/utils/toastMessages";

/**
 * Returns a handler that moves bookmarks into a sidebar category via
 * react-aria drag-and-drop. Used by both the Collections and Favorites
 * list boxes so they share the same access checks, cache lookups, and
 * optimistic mutation flow.
 */
export function useHandleBookmarksDrop() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();
  const { addCategoryToBookmarkOptimisticMutation } = useAddCategoryToBookmarkOptimisticMutation();
  const { allCategories } = useFetchCategories();
  const { everythingData, isEverythingDataLoading } = useFetchPaginatedBookmarks();
  const { flattenedSearchData } = useSearchBookmarks();

  const mergedBookmarkData = useMemo(
    () => [...(everythingData?.pages?.flat() ?? []), ...(flattenedSearchData ?? [])],
    [everythingData?.pages, flattenedSearchData],
  );

  // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- react-aria drop event has no stable public type
  const handleBookmarksDrop = async (event: any) => {
    // Only block while paginated is actively loading. Don't require its presence
    // — paginated is disabled on /similar, so `everythingData` is undefined there.
    if (isEverythingDataLoading) {
      return;
    }

    if (event?.isInternal === false) {
      const categoryId = Number.parseInt(event?.target?.key as string, 10);

      // Guard against invalid category ID
      if (Number.isNaN(categoryId)) {
        return;
      }

      const currentCategory = find(allCategories, (item) => item?.id === categoryId);

      // If target category not found, abort the drop
      if (!currentCategory) {
        return;
      }

      // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorised

      const updateAccessCondition =
        find(currentCategory?.collabData, (item) => item?.userEmail === session?.user?.email)
          ?.edit_access === true || currentCategory?.user_id?.id === session?.user?.id;

      await Promise.all(
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- drag event items lack typed API
        ((event?.items ?? []) as any[]).map(async (item: any) => {
          const bookmarkId = (await item.getText("text/plain")) as string;
          const bookmarkIdNum = Number.parseInt(bookmarkId, 10);

          let foundBookmark = find(
            mergedBookmarkData,
            (bookmarkItem) => bookmarkIdNum === bookmarkItem?.id,
          );

          // Fallback: similar-page caches. Paginated fetch is disabled on /similar,
          // so `mergedBookmarkData` never carries similar bookmarks; fall through to
          // any active similar cache keyed at [BOOKMARKS_KEY, userId, "similar", X].
          if (!foundBookmark) {
            const similarEntries = queryClient.getQueriesData<SingleListData[]>({
              queryKey: [BOOKMARKS_KEY, session?.user?.id, SIMILAR_URL],
            });
            for (const [, data] of similarEntries) {
              const match = data?.find((bm) => bm?.id === bookmarkIdNum);
              if (match) {
                foundBookmark = match;
                break;
              }
            }
          }

          // Ignore drops that aren't bookmarks (e.g., collections dragged between sidebar lists)
          if (!foundBookmark) {
            return;
          }

          // Handle both nested object (from regular fetch) and plain string (from search)
          const bookmarkCreatedUserId = foundBookmark?.user_id?.id ?? foundBookmark?.user_id;
          if (bookmarkCreatedUserId === session?.user?.id) {
            if (!updateAccessCondition) {
              // if update access is not there then user cannot drag and drop anything into the collection
              errorToast("Cannot upload in other owners collection");
              return;
            }

            addCategoryToBookmarkOptimisticMutation.mutate({
              bookmark_id: bookmarkIdNum,
              category_id: categoryId,
            });
          } else {
            errorToast("You cannot move collaborators uploads");
          }
        }),
      );
    }
  };

  return { addCategoryToBookmarkOptimisticMutation, handleBookmarksDrop };
}
