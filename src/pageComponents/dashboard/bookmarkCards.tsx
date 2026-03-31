import dynamic from "next/dynamic";
import { useEffect } from "react";
import Dropzone from "react-dropzone";
import InfiniteScroll from "react-infinite-scroll-component";

import isEmpty from "lodash/isEmpty";
import omit from "lodash/omit";

import { useMoveBookmarkToTrashOptimisticMutation } from "../../async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation";
import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useDeleteBookmarksOptimisticMutation from "../../async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/use-search-bookmarks";
import useFetchBookmarksCount from "../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import { clipboardUpload } from "../../async/uploads/clipboard-upload";
import { useFileUploadDrop } from "../../hooks/useFileUploadDrop";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import {
  useLoadersStore,
  useMiscellaneousStore,
  useSupabaseSession,
} from "../../store/componentStore";
import { mutationApiCall } from "../../utils/apiHelpers";
import { TRASH_URL } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";
import { handleBulkBookmarkDelete } from "./handleBookmarkDelete";
import { hasMoreBookmarks } from "./hasMoreBookmarks";
import SignedOutSection from "./signedOutSection";

const CardSection = dynamic(() => import("./cardSection"), {
  ssr: false,
});

export const BookmarkCards = () => {
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const { fileUploadOptimisticMutation, onDrop } = useFileUploadDrop();

  const searchText = useMiscellaneousStore((state) => state.searchText);
  const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
  const deleteBookmarkId = useMiscellaneousStore((state) => state.deleteBookmarkId);
  const setDeleteBookmarkId = useMiscellaneousStore((state) => state.setDeleteBookmarkId);

  const { bookmarksCountData } = useFetchBookmarksCount();
  const {
    everythingData,
    fetchNextPage: fetchNextBookmarkPage,
    flattendPaginationBookmarkData,
    isEverythingDataLoading,
  } = useFetchPaginatedBookmarks();
  const {
    fetchNextPage: fetchNextSearchPage,
    flattenedSearchData,
    hasNextPage: searchHasNextPage,
  } = useSearchBookmarks();
  const { moveBookmarkToTrashOptimisticMutation } = useMoveBookmarkToTrashOptimisticMutation();
  const { deleteBookmarkOptismicMutation } = useDeleteBookmarksOptimisticMutation();
  const { addBookmarkMinDataOptimisticMutation } = useAddBookmarkMinDataOptimisticMutation();

  const isSearching = !isEmpty(searchText);

  // Global clipboard upload handler
  useEffect(() => {
    if (typeof window !== "undefined") {
      const listener = (event: ClipboardEvent) => {
        if (window.location.pathname === `/${TRASH_URL}`) {
          return;
        }

        const target = event.target as HTMLElement;
        const isEditable =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest(".skip-global-paste");

        if (isEditable) {
          return;
        }

        void clipboardUpload(
          event.clipboardData?.getData("text"),
          event.clipboardData?.files,
          CATEGORY_ID,
          addBookmarkMinDataOptimisticMutation,
          fileUploadOptimisticMutation,
        );
      };

      window.addEventListener("paste", listener);
      return () => {
        window.removeEventListener("paste", listener);
      };
    }
  }, [CATEGORY_ID, addBookmarkMinDataOptimisticMutation, fileUploadOptimisticMutation]);

  if (!session) {
    return <SignedOutSection />;
  }

  return (
    <>
      <div className="mx-auto w-full max-xl:w-1/2" />
      <Dropzone disabled={CATEGORY_ID === TRASH_URL} noClick onDrop={onDrop}>
        {({ getInputProps, getRootProps, isDragActive }) => (
          <div
            {...omit(getRootProps(), ["onBlur", "onFocus"])}
            className={
              isDragActive ? "absolute z-10 h-full w-full bg-gray-800 opacity-50" : "outline-hidden"
            }
          >
            <input {...getInputProps()} />
            <div
              id="scrollableDiv"
              style={{
                height: "100vh",
                overflowAnchor: "none",
                overflowX: "hidden",
                overflowY: "auto",
              }}
            >
              <InfiniteScroll
                dataLength={
                  isSearching
                    ? (flattenedSearchData?.length ?? 0)
                    : (flattendPaginationBookmarkData?.length ?? 0)
                }
                endMessage={
                  <p className="pb-6 text-center text-plain-reverse">
                    {isSearchLoading ? "" : "Life happens, save it."}
                  </p>
                }
                hasMore={hasMoreBookmarks({
                  categoryId: CATEGORY_ID,
                  countData: bookmarksCountData?.data,
                  dataLength: flattendPaginationBookmarkData?.length,
                  hasPaginatedData: (everythingData?.pages?.length ?? 0) > 0,
                  isSearching,
                  searchHasNextPage,
                })}
                loader={null}
                next={isSearching ? fetchNextSearchPage : fetchNextBookmarkPage}
                scrollableTarget="scrollableDiv"
                style={{ overflow: "unset" }}
              >
                <CardSection
                  flattendPaginationBookmarkData={flattendPaginationBookmarkData}
                  isLoading={
                    isEverythingDataLoading ||
                    (isSearchLoading && (flattenedSearchData?.length ?? 0) === 0)
                  }
                  listData={isSearching ? flattenedSearchData : flattendPaginationBookmarkData}
                  onDeleteClick={(item) => {
                    if (CATEGORY_ID === TRASH_URL) {
                      handleBulkBookmarkDelete({
                        bookmarkIds: item?.map((delItem) => delItem?.id),
                        clearSelection: () => {
                          // intentional no-op: single-item delete doesn't need selection clearing
                        },
                        deleteBookmarkId,
                        deleteBookmarkOptismicMutation,
                        deleteForever: true,
                        errorToast,
                        flattendPaginationBookmarkData: flattendPaginationBookmarkData ?? [],
                        flattenedSearchData: flattenedSearchData ?? [],
                        isSearching,
                        isTrash: true,
                        moveBookmarkToTrashOptimisticMutation,
                        mutationApiCall,
                        sessionUserId: session?.user?.id,
                        setDeleteBookmarkId,
                      });
                    } else if (!isEmpty(item) && item?.length > 0) {
                      const firstItem = item.at(0);
                      if (firstItem) {
                        /* eslint-disable promise/prefer-await-to-then -- fire-and-forget, .catch prevents unhandled rejection */
                        void mutationApiCall(
                          moveBookmarkToTrashOptimisticMutation.mutateAsync({
                            data: [firstItem],
                            isTrash: true,
                          }),
                        ).catch(() => {
                          // error already handled by mutationApiCall's onError callback
                        });
                        /* eslint-enable promise/prefer-await-to-then */
                      }
                    }
                  }}
                  onMoveOutOfTrashClick={(data) => {
                    void mutationApiCall(
                      moveBookmarkToTrashOptimisticMutation.mutateAsync({
                        data: [data],
                        isTrash: false,
                      }),
                    );
                  }}
                />
              </InfiniteScroll>
            </div>
          </div>
        )}
      </Dropzone>
    </>
  );
};
