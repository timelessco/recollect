import { useRouter } from "next/router";
import { useCallback, useEffect, useRef } from "react";
import type { Key } from "react";
import { DragPreview, useDraggableCollection, useListBox } from "react-aria";
import type { DragItem } from "react-aria";
import { useDraggableCollectionState, useListState } from "react-stately";
import type { ListProps } from "react-stately";

import { useVirtualizer } from "@tanstack/react-virtual";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import omit from "lodash/omit";

import type { SingleListData } from "../../../types/apiTypes";

import { useMoveBookmarkToTrashOptimisticMutation } from "@/async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation";
import useDeleteBookmarksOptimisticMutation from "@/async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useSearchBookmarks from "@/async/queryHooks/bookmarks/use-search-bookmarks";
import { ClearTrashDropdown } from "@/components/clearTrashDropdown";
import { Checkbox } from "@/components/ui/recollect/checkbox";
import { mutationApiCall } from "@/utils/apiHelpers";
import { cn } from "@/utils/tailwind-merge";
import { errorToast } from "@/utils/toastMessages";

import useGetViewValue from "../../../hooks/useGetViewValue";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useMiscellaneousStore, useSupabaseSession } from "../../../store/componentStore";
import { TRASH_URL, viewValues } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";
import { handleBulkBookmarkDelete } from "../handleBookmarkDelete";
import { AddToCollectionPopover } from "./add-to-collection-popover";
import { CardViewVirtualized } from "./cardViewVirtualized";
import { SingleRowViewVirtualized } from "./listViewVirtualized";
import { MoodboardViewVirtualized } from "./moodboardViewVirtualized";
import Option from "./option";

type ListBoxDropTypes = ListProps<object> & {
  bookmarksColumns: number[];
  bookmarksList: SingleListData[];
  cardTypeCondition: unknown;
  flattendPaginationBookmarkData?: SingleListData[];
  getItems?: (keys: Set<Key>) => DragItem[];
  isPublicPage?: boolean;
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  onItemDrop?: (event: any) => void;
};

// Helper function to get scroll element
const getScrollElement = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector("#scrollableDiv");

  if (!element) {
    return document.documentElement;
  }

  return element as HTMLElement;
};

const ListBox = (props: ListBoxDropTypes) => {
  const {
    bookmarksColumns,
    bookmarksList,
    cardTypeCondition,
    flattendPaginationBookmarkData = [],
    getItems,
    isPublicPage,
  } = props;

  const deleteBookmarkId = useMiscellaneousStore((state) => state.deleteBookmarkId);
  const setDeleteBookmarkId = useMiscellaneousStore((state) => state.setDeleteBookmarkId);

  const setIsCardDragging = useMiscellaneousStore((store) => store.setIsCardDragging);

  const session = useSupabaseSession((storeState) => storeState.session);
  const searchText = useMiscellaneousStore((state) => state.searchText);

  // Hooks for data fetching
  const { flattenedSearchData } = useSearchBookmarks();
  const { moveBookmarkToTrashOptimisticMutation } = useMoveBookmarkToTrashOptimisticMutation();
  const { deleteBookmarkOptismicMutation } = useDeleteBookmarksOptimisticMutation();
  // Determine if we're currently searching
  const isSearching = !isEmpty(searchText);

  const { isMobile, isTablet } = useIsMobileView();

  // this ref is for react-aria listbox
  const ariaRef = useRef<HTMLUListElement | null>(null);

  // ---- Virtualizer Setup ----
  const rowVirtualizer = useVirtualizer({
    count: bookmarksList.length,
    estimateSize: () => {
      // Default heights if not grid-based
      if (cardTypeCondition === viewValues.list) {
        return 250;
      }

      // Figure out lanes
      let lanes = 1;
      if (cardTypeCondition === viewValues.card || cardTypeCondition === viewValues.moodboard) {
        lanes = getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);
      }

      // Get container width (fallback to 1200 if unknown)
      const containerWidth =
        typeof document !== "undefined"
          ? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1200)
          : 1200;

      // Each card width
      const cardWidth = containerWidth / lanes;

      // Estimate height based on aspect ratio (e.g., 4:3)
      const aspectRatio = 4 / 3;
      return cardWidth * aspectRatio;
    },
    getScrollElement,
    lanes: (() => {
      if (cardTypeCondition !== viewValues.card && cardTypeCondition !== viewValues.moodboard) {
        return 1;
      }

      return getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);
    })(),
    measureElement: (element, _entry, instance) => {
      const direction = instance.scrollDirection;
      if (direction === "forward" || direction === null) {
        return element.getBoundingClientRect().height;
      }
      // When scrolling up, use cached measurement to prevent stuttering
      const indexKey = Number((element as HTMLElement).dataset.index);
      const cachedMeasurement = instance.measurementsCache[indexKey]?.size;
      return cachedMeasurement ?? element.getBoundingClientRect().height;
    },
    overscan: 5,
  });
  const bookmarksInfoValue = useGetViewValue("cardContentViewArray", []);

  const router = useRouter();
  // cat_id refers to cat slug here as its got from url
  const categorySlug = getCategorySlugFromRouter(router);

  // Reset scroll to top when changing pages or view settings
  useEffect(() => {
    rowVirtualizer.scrollToIndex(0);
  }, [rowVirtualizer, cardTypeCondition, bookmarksInfoValue, categorySlug]);
  // Setup listbox as normal. See the useListBox docs for more details.
  const previewRef = useRef(null);
  const state = useListState(props);

  // hook up aria listbox
  const { listBoxProps } = useListBox(
    {
      ...props,
      autoFocus: false,
      // Prevent dragging from changing selection.
      shouldSelectOnPressUp: true,
    },
    state,
    ariaRef,
  );

  useEffect(() => {
    state.selectionManager.clearSelection();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [router.asPath]);

  // Setup drag state for the collection.
  const dragState = useDraggableCollectionState({
    // Pass through events from props.
    ...props,
    // Collection and selection manager come from list state.
    collection: state.collection,
    // Provide data for each dragged item. This function could
    // also be provided by the user of the component.
    getItems:
      getItems ??
      ((keys) =>
        [...keys].map((key) => {
          const item = state.collection.getItem(key);
          return {
            "text/plain": !isNull(item) ? item.textValue : "",
          };
        })),
    onDragEnd() {
      setIsCardDragging(false);
      state.selectionManager.clearSelection();
    },
    onDragStart() {
      setIsCardDragging(true);
    },
    preview: previewRef,
    selectionManager: state.selectionManager,
  });

  // IMPORTANT: ariaRef is passed here so listeners attach properly
  useDraggableCollection(props, dragState, ariaRef);

  const ulClassName = cn("outline-hidden focus:outline-hidden", {
    block: cardTypeCondition === viewValues.list,
    "mx-auto max-w-[600px] space-y-4": cardTypeCondition === viewValues.timeline,
  });

  const isTrashPage = categorySlug === TRASH_URL;

  // Bulk delete handler
  const onBulkBookmarkDelete = useCallback(
    (bookmarkIds: Key[], deleteForever: boolean, isTrash: boolean) => {
      handleBulkBookmarkDelete({
        bookmarkIds: bookmarkIds.map(Number),
        clearSelection: () => {
          state.selectionManager.clearSelection();
        },
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
        sessionUserId: session?.user?.id,
        setDeleteBookmarkId,
      });
    },
    [
      deleteBookmarkId,
      deleteBookmarkOptismicMutation,
      flattendPaginationBookmarkData,
      flattenedSearchData,
      isSearching,
      moveBookmarkToTrashOptimisticMutation,
      session?.user?.id,
      setDeleteBookmarkId,
      state,
    ],
  );

  const renderOption = (virtualIndex: number) => {
    const item = [...state.collection][virtualIndex];

    if (!item) {
      return null;
    }

    const bookmarkData = bookmarksList[virtualIndex];
    return (
      <Option
        cardTypeCondition={cardTypeCondition}
        dragState={dragState}
        isPublicPage={isPublicPage}
        isTrashPage={isTrashPage}
        item={item}
        key={item.key}
        state={state}
        type={bookmarkData?.type ?? ""}
        url={bookmarkData?.url ?? ""}
      />
    );
  };

  return (
    <>
      <ul
        {...omit(listBoxProps, ["onKeyDown", "onKeyDownCapture", "onKeyUp", "onKeyUpCapture"])}
        className={ulClassName}
        ref={ariaRef}
      >
        {cardTypeCondition === viewValues.moodboard ? (
          <MoodboardViewVirtualized renderOption={renderOption} rowVirtualizer={rowVirtualizer} />
        ) : (
          <div
            style={
              cardTypeCondition === viewValues.card
                ? { position: "relative" }
                : {
                    height: rowVirtualizer?.getTotalSize(),
                    position: "relative",
                  }
            }
          >
            {cardTypeCondition === viewValues.card ? (
              <CardViewVirtualized
                bookmarksColumns={bookmarksColumns}
                bookmarksList={bookmarksList}
                getScrollElement={getScrollElement}
                renderOption={renderOption}
              />
            ) : (
              <SingleRowViewVirtualized
                cardTypeCondition={cardTypeCondition}
                renderOption={renderOption}
                rowVirtualizer={rowVirtualizer}
              />
            )}
          </div>
        )}
        <DragPreview ref={previewRef}>
          {(items) => (
            <div className="rounded-lg bg-slate-200 px-2 py-1 text-sm leading-4 dark:bg-gray-alpha-100">
              {items.length > 1
                ? `${items.length} bookmarks`
                : find(
                    bookmarksList,
                    (item) => item?.id === Number.parseInt(items[0]["text/plain"], 10),
                  )?.title}
            </div>
          )}
        </DragPreview>
      </ul>
      {state.selectionManager.selectedKeys.size > 0 && (
        <div className="fixed bottom-12 left-[40%] flex w-[596px] items-center justify-between rounded-[14px] bg-gray-50 px-[11px] py-[9px] shadow-custom-6 max-xl:left-1/2 max-xl:-translate-x-1/2 max-md:hidden">
          <div className="flex items-center gap-1">
            <label className="group relative flex cursor-pointer items-center justify-center gap-2">
              <Checkbox
                checked={[...state.selectionManager.selectedKeys.keys()]?.length > 0}
                className="flex size-4 items-center justify-center gap-3 rounded-[5px] text-[10px] leading-[21px] font-450 tracking-[1%] text-gray-900 data-checked:bg-plain-reverse data-checked:text-plain data-unchecked:bg-plain data-unchecked:text-plain-reverse"
                onCheckedChange={() => {
                  state.selectionManager.clearSelection();
                }}
              />

              {`${[...state.selectionManager.selectedKeys.keys()]?.length} bookmarks`}
            </label>

            {/* <Button
							className="p-1 text-13 font-450 leading-[15px] text-gray-900"
							onClick={() => state.selectionManager.selectAll()}
						>
							Select all
						</Button> */}
          </div>
          <div className="flex items-center">
            {!isTrashPage ? (
              <button
                className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
                onClick={() => {
                  onBulkBookmarkDelete(
                    [...state.selectionManager.selectedKeys.keys()],
                    false,
                    true,
                  );
                  state.selectionManager.clearSelection();
                }}
                type="button"
              >
                Delete
              </button>
            ) : (
              <ClearTrashDropdown
                isBottomBar
                isClearingTrash={
                  [...state.selectionManager.selectedKeys.keys()].some((key) =>
                    deleteBookmarkId?.includes(Number.parseInt(key.toString(), 10)),
                  ) ?? false
                }
                label="Delete Bookmarks"
                onClearTrash={() => {
                  onBulkBookmarkDelete(
                    [...state.selectionManager.selectedKeys.keys()] as number[],
                    true,
                    true,
                  );
                }}
              />
            )}
            {isTrashPage && (
              <button
                className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
                onClick={() => {
                  onBulkBookmarkDelete(
                    [...state.selectionManager.selectedKeys.keys()] as number[],
                    false,
                    false,
                  );
                  state.selectionManager.clearSelection();
                }}
                type="button"
              >
                Recover
              </button>
            )}
            {!isTrashPage && (
              <AddToCollectionPopover
                onSuccess={() => {
                  state.selectionManager.clearSelection();
                }}
                selectedKeys={state.selectionManager.selectedKeys}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ListBox;
