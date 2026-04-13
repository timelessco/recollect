import type { DroppableCollectionReorderEvent } from "react-aria";
import { Item } from "react-stately";

import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import type {
  BookmarksCountTypes,
  CategoriesData,
  FetchSharedCategoriesData,
} from "../../../types/apiTypes";
import type { CollectionItemTypes } from "./singleListItemComponent";

import useUpdateCategoryOrderOptimisticMutation from "../../../async/mutationHooks/category/useUpdateCategoryOrderOptimisticMutation";
import useFetchCategories from "../../../async/queryHooks/category/use-fetch-categories";
import useFetchUserProfile from "../../../async/queryHooks/user/useFetchUserProfile";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useMiscellaneousStore, useSupabaseSession } from "../../../store/componentStore";
import { mutationApiCall } from "../../../utils/apiHelpers";
import {
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { CollectionsListSection } from "./collections-list-section";
import { FavoriteCollectionsList } from "./favorite-collections-list";
import { ReorderableListBox } from "./reorderable-list";
import SingleListItemComponent from "./singleListItemComponent";
import { useHandleBookmarksDrop } from "./use-handle-bookmarks-drop";

const RenderDragPreview = ({ collectionName }: { collectionName: string }) => {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const categoryData = queryClient.getQueryData<CategoriesData[]>([
    CATEGORIES_KEY,
    session?.user?.id,
  ]);

  const userId = session?.user?.id;

  const singleCategoryData = find(categoryData, (item) => item.category_name === collectionName);

  const isUserCollectionOwner = singleCategoryData?.user_id?.id === userId;

  if (isUserCollectionOwner) {
    return <div className="text-gray-1000">{collectionName}</div>;
  }

  return <div className="text-gray-1000">Non Owner collection cannot be sorted</div>;
};

const CollectionsList = () => {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);

  const isCardDragging = useMiscellaneousStore((storeState) => storeState.isCardDragging);
  const { updateCategoryOrderMutation } = useUpdateCategoryOrderOptimisticMutation();
  const { isLoadingCategories } = useFetchCategories();
  const { userProfileData } = useFetchUserProfile();
  const { addCategoryToBookmarkOptimisticMutation, handleBookmarksDrop } = useHandleBookmarksDrop();

  const currentPath = useGetCurrentUrlPath();

  const categoryData = queryClient.getQueryData<CategoriesData[]>([
    CATEGORIES_KEY,
    session?.user?.id,
  ]);

  const sharedCategoriesData = queryClient.getQueryData<{
    data: FetchSharedCategoriesData[];
  }>([SHARED_CATEGORIES_TABLE_NAME]);

  const bookmarksCountData = queryClient.getQueryData<BookmarksCountTypes>([
    BOOKMARKS_COUNT_KEY,
    session?.user?.id,
  ]);

  const favoriteCategories = userProfileData?.data?.[0]?.favorite_categories ?? [];

  const collectionsList = session
    ? categoryData?.map((item) => ({
        count: find(
          bookmarksCountData?.categoryCount,
          (catItem) => catItem?.category_id === item?.id,
        )?.count,
        current: currentPath === item?.category_slug,
        href: `/${item?.category_slug}`,
        iconColor: item?.icon_color,
        iconValue: item?.icon,
        id: item?.id,
        isCollab: !isEmpty(
          find(sharedCategoriesData?.data, (cat) => cat?.category_id === item?.id),
        ),
        isFavorite: favoriteCategories.includes(item?.id),
        isPublic: item?.is_public,
        name: item?.category_name,
      }))
    : [];
  const sortedList = () => {
    const array: CollectionItemTypes[] = [];
    if (!isEmpty(userProfileData?.data)) {
      const apiCategoryOrder = userProfileData?.data?.[0].category_order;

      if (!isNull(apiCategoryOrder)) {
        if (apiCategoryOrder) {
          for (const item of apiCategoryOrder) {
            const data = find(collectionsList, (dataItem) => dataItem?.id === item);

            if (data) {
              array.push(data);
            }
          }
        }

        const categoriesNotThereInApiCategoryOrder: CollectionItemTypes[] = [];

        if (collectionsList) {
          for (const item of collectionsList) {
            const data = find(apiCategoryOrder, (dataItem) => dataItem === item?.id);

            if (!data) {
              categoriesNotThereInApiCategoryOrder.push(item);
            }
          }
        }

        return [...array, ...categoriesNotThereInApiCategoryOrder];
      }

      return collectionsList;
    }

    return collectionsList;
  };

  const allSorted = sortedList() ?? [];

  // Sort favorites by their position in the favorite_categories array
  const sortedFavorites = () => {
    const favorites = allSorted.filter((item) => item.isFavorite);

    if (favoriteCategories.length === 0) {
      return favorites;
    }

    const ordered: CollectionItemTypes[] = [];
    for (const id of favoriteCategories) {
      const found = favorites.find((item) => item.id === id);
      if (found) {
        ordered.push(found);
      }
    }

    // Append any favorites not in the array (newly favorited)
    for (const item of favorites) {
      if (!favoriteCategories.includes(item.id)) {
        ordered.push(item);
      }
    }

    return ordered;
  };

  const favoriteCollections = sortedFavorites();

  const onReorder = (event: DroppableCollectionReorderEvent) => {
    const apiOrder = userProfileData?.data?.[0].category_order;

    const listOrder = isNull(apiOrder)
      ? collectionsList?.map((item) => item?.id)
      : userProfileData?.data?.[0].category_order;

    const targetKey = Number.parseInt(event?.target?.key as string, 10);
    const sourceKey = Number.parseInt(event?.keys?.values().next().value as string, 10);

    const sourceIndex = listOrder?.indexOf(sourceKey);

    if (!listOrder || sourceIndex === undefined || sourceIndex === -1) {
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
      updateCategoryOrderMutation?.mutateAsync({
        order: newOrder,
      }),
    );
  };

  return (
    <>
      <FavoriteCollectionsList favoriteCollections={favoriteCollections} />

      <CollectionsListSection isLoading={isLoadingCategories}>
        <ReorderableListBox
          aria-label="Categories-drop"
          highlightDropTarget={isCardDragging}
          // oxlint-disable-next-line @typescript-eslint/no-explicit-any
          onItemDrop={(event: any) => {
            void handleBookmarksDrop(event);
          }}
          onReorder={onReorder}
          renderDragPreview={(items) => (
            <RenderDragPreview collectionName={items[0]["text/plain"]} />
          )}
          selectionBehavior="replace"
          selectionMode="multiple"
        >
          {allSorted.map((item) => (
            <Item key={item?.id} textValue={item?.name}>
              <SingleListItemComponent
                extendedClassname="py-[6px]"
                item={item}
                listNameId="collection-name"
                showDropdown
                showSpinner={
                  addCategoryToBookmarkOptimisticMutation.isPending &&
                  addCategoryToBookmarkOptimisticMutation.variables?.category_id === item?.id
                }
              />
            </Item>
          ))}
        </ReorderableListBox>
      </CollectionsListSection>
    </>
  );
};

export default CollectionsList;
