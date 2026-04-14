import { useState } from "react";
import type { Key } from "react";

import isEmpty from "lodash/isEmpty";

import { useAddCategoryToBookmarksOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmarks-optimistic-mutation";
import { useRemoveCategoryFromBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-remove-category-from-bookmark-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import { CollectionIcon } from "@/components/collectionIcon";
import { Menu } from "@/components/ui/recollect/menu";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import MoveIcon from "@/icons/moveIcon";
import { TickIcon } from "@/icons/tickIcon";

interface AddToCollectionPopoverProps {
  onSuccess: () => void;
  selectedKeys: Set<Key>;
}

export function AddToCollectionPopover({ onSuccess, selectedKeys }: AddToCollectionPopoverProps) {
  const [addedCategoryIds, setAddedCategoryIds] = useState<Set<number>>(() => new Set());

  const handleOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    if (addedCategoryIds.size > 0) {
      onSuccess();
    }

    setAddedCategoryIds(new Set());
  };

  return (
    <Menu.Root onOpenChange={handleOpenChange}>
      <Menu.Trigger className="flex items-center rounded-lg bg-gray-200 px-2 py-[5px] text-13 leading-4 font-450 text-gray-900">
        <span aria-hidden="true" className="mr-[6px] text-gray-1000">
          <MoveIcon />
        </span>
        <p>Add to</p>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end">
          <Menu.Popup className="leading-[20px]">
            <AddToCollectionMenuItems
              addedCategoryIds={addedCategoryIds}
              onToggle={setAddedCategoryIds}
              selectedKeys={selectedKeys}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

interface AddToCollectionMenuItemsProps {
  addedCategoryIds: Set<number>;
  onToggle: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectedKeys: Set<Key>;
}

function AddToCollectionMenuItems({
  addedCategoryIds,
  onToggle,
  selectedKeys,
}: AddToCollectionMenuItemsProps) {
  const { allCategories } = useFetchCategories();
  const { addCategoryToBookmarksOptimisticMutation } =
    useAddCategoryToBookmarksOptimisticMutation();
  const { removeCategoryFromBookmarkOptimisticMutation } =
    useRemoveCategoryFromBookmarkOptimisticMutation();

  if (isEmpty(allCategories)) {
    return null;
  }

  const categories = allCategories ?? [];

  const handleToggle = (categoryId: number, checked: boolean) => {
    const selectedIds = [...selectedKeys].map(Number);

    if (!checked) {
      for (const bookmarkId of selectedIds) {
        removeCategoryFromBookmarkOptimisticMutation.mutate({
          bookmark_id: bookmarkId,
          category_id: categoryId,
        });
      }
    } else {
      addCategoryToBookmarksOptimisticMutation.mutate({
        bookmark_ids: selectedIds,
        category_id: categoryId,
      });
    }

    onToggle((previous) => {
      const next = new Set(previous);

      if (!checked) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  return (
    <ScrollArea hideScrollbar scrollbarGutter scrollFade scrollHeight={220}>
      {categories.map((item) => (
        <Menu.CheckboxItem
          checked={addedCategoryIds.has(item.id)}
          className="gap-2"
          key={item.id}
          onCheckedChange={(checked) => {
            handleToggle(item.id, checked);
          }}
        >
          <CollectionIcon bookmarkCategoryData={item} iconSize="10" size="16" />
          <span className="flex-1 truncate">{item.category_name}</span>
          <Menu.CheckboxItemIndicator className="ml-auto flex size-4 shrink-0 items-center justify-center">
            <TickIcon className="text-gray-800" />
          </Menu.CheckboxItemIndicator>
        </Menu.CheckboxItem>
      ))}
    </ScrollArea>
  );
}
