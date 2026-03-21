import { useRef, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useToggleFavoriteCategoryOptimisticMutation } from "@/async/mutationHooks/user/use-toggle-favorite-category-optimistic-mutation";
import useFetchBookmarksCount from "@/async/queryHooks/bookmarks/useFetchBookmarksCount";
import { DeleteCollectionConfirm } from "@/components/delete-collection-confirm";
import { AnimatedSize } from "@/components/ui/recollect/animated-size";
import { Menu } from "@/components/ui/recollect/menu";
import { useDeleteCollectionActions } from "@/hooks/useDeleteCollectionActions";
import OptionsIcon from "@/icons/optionsIcon";

import ShareContent from "../share/shareContent";
import { type CollectionItemTypes } from "./singleListItemComponent";

type CollectionOptionsPopoverProps = {
  item: CollectionItemTypes;
};

type ViewState = "closed" | "delete" | "menu" | "share";

export function CollectionOptionsPopover({ item }: CollectionOptionsPopoverProps) {
  const [view, setView] = useState<ViewState>("closed");
  const [exitingMenu, setExitingMenu] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isItemClickRef = useRef(false);

  const popoverOpen = view === "menu" || view === "share" || view === "delete";
  const showTrigger = view !== "closed" || exitingMenu;
  const fade = shouldReduceMotion ? { duration: 0 } : { duration: 0.15 };

  const handleMenuOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setExitingMenu(false);
      setView("menu");
      return;
    }

    // Skip close if a Menu.Item onClick already transitioned the view
    if (isItemClickRef.current) {
      isItemClickRef.current = false;
      return;
    }

    // Keep trigger visible during exit animation so floating-ui
    // retains a valid anchor. Cleared in onOpenChangeComplete.
    setExitingMenu(true);
    setView("closed");
  };

  return (
    <>
      <Menu.Root
        open={popoverOpen}
        onOpenChange={handleMenuOpenChange}
        onOpenChangeComplete={() => setExitingMenu(false)}
      >
        <Menu.Trigger
          aria-label="Collection options"
          className={
            showTrigger
              ? "flex text-gray-500 outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
              : "hidden text-gray-500 outline-hidden group-hover:flex focus-visible:ring-1 focus-visible:ring-gray-200"
          }
        >
          <OptionsIcon />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start">
            <Menu.Popup className="w-auto overflow-clip p-0 leading-[20px]">
              <AnimatedSize>
                <AnimatePresence mode="popLayout" initial={false}>
                  {view === "menu" && (
                    <motion.div
                      key="menu"
                      className="w-48 p-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={fade}
                    >
                      <FavoriteMenuItem categoryId={item.id} isFavorite={item.isFavorite} />
                      <Menu.Item
                        onClick={(event) => {
                          event.stopPropagation();
                          isItemClickRef.current = true;
                          setView("share");
                        }}
                      >
                        Share
                      </Menu.Item>
                      <Menu.Item
                        onClick={(event) => {
                          event.stopPropagation();
                          isItemClickRef.current = true;
                          setView("delete");
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </motion.div>
                  )}
                  {view === "share" && (
                    <motion.div
                      key="share"
                      className="p-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={fade}
                    >
                      <div className="w-75 rounded-lg bg-gray-50">
                        <ShareContent categoryId={item.id} />
                      </div>
                    </motion.div>
                  )}
                  {view === "delete" && (
                    <motion.div
                      key="delete"
                      className="w-auto p-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={fade}
                    >
                      <DeleteCollectionContent categoryId={item.id} isCurrent={item.current} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </AnimatedSize>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      {item.count !== undefined && item.current && (
        <div className="flex w-full justify-end">
          <p
            className={`block text-right text-[11px] leading-[115%] font-450 tracking-[0.03em] text-gray-600 group-hover:hidden ${showTrigger ? "hidden" : ""}`}
          >
            {item.count}
          </p>
        </div>
      )}
    </>
  );
}

interface FavoriteMenuItemProps {
  categoryId: number;
  isFavorite?: boolean;
}

function FavoriteMenuItem({ categoryId, isFavorite }: FavoriteMenuItemProps) {
  const { toggleFavoriteCategoryOptimisticMutation } =
    useToggleFavoriteCategoryOptimisticMutation();

  return (
    <Menu.Item
      onClick={(event) => {
        event.stopPropagation();
        toggleFavoriteCategoryOptimisticMutation.mutate({
          category_id: categoryId,
        });
      }}
    >
      {isFavorite ? "Unfavorite" : "Favorite"}
    </Menu.Item>
  );
}

interface DeleteCollectionContentProps {
  categoryId: number;
  isCurrent: boolean;
}

function DeleteCollectionContent({ categoryId, isCurrent }: DeleteCollectionContentProps) {
  const { pendingMode, handleDeleteAll, handleKeepBookmarks } = useDeleteCollectionActions({
    categoryId,
    isCurrent,
  });
  const { bookmarksCountData } = useFetchBookmarksCount();
  const count =
    bookmarksCountData?.data?.categoryCount?.find((category) => category.category_id === categoryId)
      ?.count ?? 0;

  return (
    <DeleteCollectionConfirm
      count={count}
      onDeleteCollection={handleKeepBookmarks}
      onDeleteAll={handleDeleteAll}
      pendingMode={pendingMode}
    />
  );
}
