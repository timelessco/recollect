import { useRef, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DeleteCollectionConfirm } from "@/components/delete-collection-confirm";
import { DestructiveConfirmContent } from "@/components/destructive-confirm-content";
import { AnimatedSize } from "@/components/ui/recollect/animated-size";
import { Menu } from "@/components/ui/recollect/menu";

import useClearBookmarksInTrashMutation from "../../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation";
import useFetchBookmarksCount from "../../../async/queryHooks/bookmarks/use-fetch-bookmarks-count";
import { BookmarksSortDropdown } from "../../../components/customDropdowns.tsx/bookmarksSortDropdown";
import { BookmarksViewDropdown } from "../../../components/customDropdowns.tsx/bookmarksViewDropdown";
import { useDeleteCollectionActions } from "../../../hooks/useDeleteCollectionActions";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import RenameIcon from "../../../icons/actionIcons/renameIcon";
import OptionsIcon from "../../../icons/optionsIcon";
import ShareIcon from "../../../icons/shareIcon";
import { TrashIconGray } from "../../../icons/trash-icon-gray";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { DISCOVER_URL, TRASH_URL } from "../../../utils/constants";
import ShareContent from "../share/shareContent";

type ViewState = "closed" | "delete-collection" | "menu" | "share" | "sort" | "trash" | "view";

export function HeaderOptionsPopover() {
  const [view, setView] = useState<ViewState>("closed");
  const shouldReduceMotion = useReducedMotion();
  const isItemClickRef = useRef(false);

  const popoverOpen = view !== "closed";
  const fade = shouldReduceMotion ? { duration: 0 } : { duration: 0.15 };

  const handleMenuOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setView("menu");
      return;
    }

    if (isItemClickRef.current) {
      isItemClickRef.current = false;
      return;
    }

    setView("closed");
  };

  return (
    <Menu.Root onOpenChange={handleMenuOpenChange} open={popoverOpen}>
      <Menu.Trigger
        aria-label="Page options"
        className="rounded-lg bg-transparent p-[7px] text-gray-600 hover:bg-gray-100 hover:text-plain-reverse"
      >
        <OptionsIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end">
          <Menu.Popup className="w-auto overflow-clip p-0 leading-[20px]">
            <AnimatedSize>
              <AnimatePresence initial={false} mode="popLayout">
                {view === "menu" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="w-[180px] p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="menu"
                    transition={fade}
                  >
                    <HeaderMenuItems isItemClickRef={isItemClickRef} onSelectView={setView} />
                  </motion.div>
                )}
                {view === "view" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="w-[180px] p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="view"
                    transition={fade}
                  >
                    <BookmarksViewDropdown isDropdown={false} />
                  </motion.div>
                )}
                {view === "sort" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="w-[180px] p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="sort"
                    transition={fade}
                  >
                    <BookmarksSortDropdown isDropdown={false} />
                  </motion.div>
                )}
                {view === "share" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="share"
                    transition={fade}
                  >
                    <div className="w-[300px]">
                      <ShareContent />
                    </div>
                  </motion.div>
                )}
                {view === "trash" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="w-[180px] p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="trash"
                    transition={fade}
                  >
                    <ClearTrashTabContent
                      onClose={() => {
                        setView("closed");
                      }}
                    />
                  </motion.div>
                )}
                {view === "delete-collection" && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="w-56 p-1"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="delete-collection"
                    transition={fade}
                  >
                    <DeleteCollectionTabContent />
                  </motion.div>
                )}
              </AnimatePresence>
            </AnimatedSize>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

interface HeaderMenuItemsProps {
  isItemClickRef: React.RefObject<boolean>;
  onSelectView: (view: ViewState) => void;
}

function HeaderMenuItems({ isItemClickRef, onSelectView }: HeaderMenuItemsProps) {
  const currentPath = useGetCurrentUrlPath();
  const { category_id: categoryId } = useGetCurrentCategoryId();

  const isCategory = typeof categoryId === "number";
  const showSort = currentPath !== DISCOVER_URL && currentPath !== TRASH_URL;
  const showTrash = currentPath === TRASH_URL;

  const selectView = (nextView: ViewState) => {
    isItemClickRef.current = true;
    onSelectView(nextView);
  };

  return (
    <>
      <Menu.Item
        className="rounded-lg p-0 data-highlighted:bg-gray-200"
        onClick={() => {
          selectView("view");
        }}
      >
        <BookmarksViewDropdown renderOnlyButton />
      </Menu.Item>
      {showSort && (
        <Menu.Item
          className="rounded-lg p-0 data-highlighted:bg-gray-200"
          onClick={() => {
            selectView("sort");
          }}
        >
          <BookmarksSortDropdown renderOnlyButton />
        </Menu.Item>
      )}
      {showTrash && (
        <Menu.Item
          className="text-red-600 data-highlighted:text-red-600"
          onClick={() => {
            selectView("trash");
          }}
        >
          <TrashIconGray className="size-4" />
          <span className="ml-[6px]">Clear Trash</span>
        </Menu.Item>
      )}
      {isCategory && (
        <>
          <Menu.Item
            onClick={() => {
              selectView("share");
            }}
          >
            <ShareIcon />
            <span className="ml-[6px]">Share</span>
          </Menu.Item>
          <RenameMenuItem />
          <Menu.Item
            className="text-red-600 data-highlighted:text-red-600"
            onClick={() => {
              selectView("delete-collection");
            }}
          >
            <TrashIconGray className="size-4" />
            <span className="ml-[6px]">Delete collection</span>
          </Menu.Item>
        </>
      )}
    </>
  );
}

function RenameMenuItem() {
  const setTriggerHeadingEdit = useMiscellaneousStore((state) => state.setTriggerHeadingEdit);

  return (
    <Menu.Item
      onClick={() => {
        setTriggerHeadingEdit(true);
        setTimeout(() => {
          setTriggerHeadingEdit(false);
        }, 0);
      }}
    >
      <RenameIcon />
      <span className="ml-[6px]">Rename</span>
    </Menu.Item>
  );
}

function ClearTrashTabContent({ onClose }: { onClose: () => void }) {
  const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
    useClearBookmarksInTrashMutation();
  const { bookmarksCountData } = useFetchBookmarksCount();
  const trashCount = bookmarksCountData?.trash ?? 0;

  return (
    <DestructiveConfirmContent
      description={`${trashCount} ${trashCount === 1 ? "bookmark" : "bookmarks"}`}
      label="Clear All Trash"
      onConfirm={() => {
        async function clearTrash() {
          await mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
          onClose();
        }

        void clearTrash();
      }}
      pending={isClearingTrash}
    />
  );
}

function DeleteCollectionTabContent() {
  const { category_id: categoryId } = useGetCurrentCategoryId();
  const { bookmarksCountData } = useFetchBookmarksCount();
  const { handleDeleteAll, handleKeepBookmarks, pendingMode } = useDeleteCollectionActions({
    categoryId: categoryId as number,
    isCurrent: true,
  });
  const count =
    bookmarksCountData?.categoryCount?.find((category) => category.category_id === categoryId)
      ?.count ?? 0;

  return (
    <DeleteCollectionConfirm
      count={count}
      onDeleteAll={() => {
        void handleDeleteAll();
      }}
      onDeleteCollection={() => {
        void handleKeepBookmarks();
      }}
      pendingMode={pendingMode}
    />
  );
}
