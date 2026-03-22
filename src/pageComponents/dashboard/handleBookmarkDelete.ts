import { find } from "lodash";

import type { SingleListData } from "@/types/apiTypes";

import { isBookmarkOwner } from "@/utils/helpers";

interface BulkDeleteBookmarkParams {
  bookmarkIds: number[];
  clearSelection: () => void;
  deleteBookmarkId: number[] | undefined;
  deleteBookmarkOptismicMutation: {
    mutateAsync: (data: { deleteData: { id: number }[] }) => Promise<unknown>;
  };
  deleteForever: boolean;
  errorToast: (message: string) => void;
  flattendPaginationBookmarkData: SingleListData[];
  flattenedSearchData: SingleListData[];
  isSearching: boolean;
  isTrash: boolean;
  moveBookmarkToTrashOptimisticMutation: {
    mutateAsync: (data: { data: SingleListData[]; isTrash: boolean }) => Promise<unknown>;
  };
  mutationApiCall: (apiCall: Promise<unknown>) => Promise<unknown>;
  sessionUserId: string | undefined;
  setDeleteBookmarkId: (bookmarkIds: number[]) => void;
}

export const handleBulkBookmarkDelete = ({
  bookmarkIds,
  clearSelection,
  deleteBookmarkId,
  deleteBookmarkOptismicMutation,
  deleteForever,
  errorToast,
  flattendPaginationBookmarkData,
  flattenedSearchData,
  isSearching,
  isTrash,
  moveBookmarkToTrashOptimisticMutation,
  mutationApiCall,
  sessionUserId,
  setDeleteBookmarkId,
}: BulkDeleteBookmarkParams) => {
  const currentBookmarksData = isSearching ? flattenedSearchData : flattendPaginationBookmarkData;
  if (!deleteForever) {
    const foundBookmarks = bookmarkIds
      .map((id) => find(currentBookmarksData, (item) => item?.id === id)!)
      .filter(Boolean);

    const ownedBookmarks: SingleListData[] = [];
    let skippedCount = 0;

    for (const bookmark of foundBookmarks) {
      if (isBookmarkOwner(bookmark.user_id, sessionUserId)) {
        ownedBookmarks.push(bookmark);
      } else {
        skippedCount += 1;
      }
    }

    if (skippedCount > 0) {
      errorToast(
        skippedCount === 1
          ? "Cannot delete 1 bookmark owned by another user"
          : `Cannot delete ${skippedCount} bookmarks owned by other users`,
      );
    }

    if (ownedBookmarks.length > 0) {
      void mutationApiCall(
        moveBookmarkToTrashOptimisticMutation.mutateAsync({
          data: ownedBookmarks,
          isTrash,
        }),
      );
      // Clear selection to close the selection bar
      clearSelection();
    }
  } else {
    const bookmarksToDelete = [...(deleteBookmarkId ?? []), ...bookmarkIds];
    if (bookmarksToDelete.length > 0) {
      setDeleteBookmarkId(bookmarksToDelete);
      const deleteData = bookmarksToDelete
        .map((delItem) => {
          const idAsNumber =
            typeof delItem === "number" ? delItem : Number.parseInt(delItem as string, 10);

          const delBookmarkData = find(currentBookmarksData, (item) => item?.id === idAsNumber);

          if (!delBookmarkData) {
            console.warn(`Bookmark ${idAsNumber} not found in current data`);
            return null;
          }

          return { id: idAsNumber };
        })
        .filter(Boolean);

      void mutationApiCall(
        deleteBookmarkOptismicMutation.mutateAsync({
          deleteData,
        }),
      );
      setDeleteBookmarkId([]);
      // Clear selection to close the selection bar
      clearSelection();
    }
  }
};
