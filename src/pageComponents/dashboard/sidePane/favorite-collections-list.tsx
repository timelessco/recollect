import type { DroppableCollectionReorderEvent } from "react-aria";
import { Item } from "react-stately";

import type { CollectionItemTypes } from "./singleListItemComponent";

import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { useUpdateFavoriteOrderMutation } from "@/async/mutationHooks/user/use-update-favorite-order-mutation";
import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";
import { Collapsible } from "@/components/ui/recollect/collapsible";
import { useMiscellaneousStore } from "@/store/componentStore";
import { mutationApiCall } from "@/utils/apiHelpers";

import DownArrowGray from "../../../icons/downArrowGray";
import { ReorderableListBox } from "./reorderable-list";
import SingleListItemComponent from "./singleListItemComponent";
import { useHandleBookmarksDrop } from "./use-handle-bookmarks-drop";

interface FavoriteCollectionsListProps {
  favoriteCollections: CollectionItemTypes[];
}

export function FavoriteCollectionsList({ favoriteCollections }: FavoriteCollectionsListProps) {
  const { updateFavoriteOrderMutation } = useUpdateFavoriteOrderMutation();
  const { userProfileData } = useFetchUserProfile();
  const isCardDragging = useMiscellaneousStore((storeState) => storeState.isCardDragging);
  const { handleBookmarksDrop } = useHandleBookmarksDrop();

  if (favoriteCollections.length === 0) {
    return null;
  }

  const onReorder = (event: DroppableCollectionReorderEvent) => {
    const currentFavoriteCategories = userProfileData?.data?.[0]?.favorite_categories ?? [];

    // Fall back to the order from the collections list if no saved order
    const listOrder =
      currentFavoriteCategories.length > 0
        ? currentFavoriteCategories
        : favoriteCollections.map((item) => item.id);

    const targetKey = Number.parseInt(event.target.key as string, 10);
    const sourceKey = Number.parseInt(event.keys.values().next().value as string, 10);

    const targetIndex = listOrder.indexOf(targetKey);
    const sourceIndex = listOrder.indexOf(sourceKey);

    if (targetIndex === -1 || sourceIndex === -1) {
      return;
    }

    const movingItem = listOrder[sourceIndex];
    const newOrder = listOrder.filter((item) => item !== movingItem);
    const newTargetIndex = newOrder.indexOf(targetKey);

    if (newTargetIndex === -1) {
      return;
    }

    const insertIndex = event.target.dropPosition === "after" ? newTargetIndex + 1 : newTargetIndex;
    newOrder.splice(insertIndex, 0, movingItem);

    void mutationApiCall(
      updateFavoriteOrderMutation.mutateAsync({
        favorite_categories: newOrder,
      }),
    );
  };

  const favoritesHeader = (
    <div className="group flex w-full items-center justify-between px-1 py-[7px]">
      <div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
        <p className="mr-1">Favorites</p>
        <DownArrowGray
          className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
          size={10}
        />
      </div>
    </div>
  );

  return (
    <div className="pt-3">
      <Collapsible.Root>
        <Collapsible.Trigger>{favoritesHeader}</Collapsible.Trigger>
        <Collapsible.Panel>
          <ReorderableListBox
            aria-label="Favorite collections"
            highlightDropTarget={isCardDragging}
            onItemDrop={(event) => {
              void handleBookmarksDrop(event);
            }}
            onReorder={onReorder}
            renderDragPreview={(items) => (
              <div className="text-gray-1000">{items[0]["text/plain"]}</div>
            )}
            selectionBehavior="replace"
            selectionMode="multiple"
          >
            {favoriteCollections.map((item) => (
              <Item key={item.id} textValue={item.name}>
                <FavoriteCollectionItem item={item} />
              </Item>
            ))}
          </ReorderableListBox>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}

interface FavoriteCollectionItemProps {
  item: CollectionItemTypes;
}

function FavoriteCollectionItem({ item }: FavoriteCollectionItemProps) {
  const { addCategoryToBookmarkOptimisticMutation } = useAddCategoryToBookmarkOptimisticMutation();

  return (
    <SingleListItemComponent
      extendedClassname="py-[6px]"
      item={item}
      listNameId="favorite-collection-name"
      showDropdown
      showSpinner={
        addCategoryToBookmarkOptimisticMutation.isPending &&
        addCategoryToBookmarkOptimisticMutation.variables?.category_id === item.id
      }
    />
  );
}
