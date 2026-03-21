import { useMemo } from "react";
import { type DroppableCollectionReorderEvent } from "react-aria";
import { Item } from "react-stately";

import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";

import useUpdateCategoryOrderOptimisticMutation from "../../../async/mutationHooks/category/useUpdateCategoryOrderOptimisticMutation";
import useFetchPaginatedBookmarks from "../../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../../async/queryHooks/user/useFetchUserProfile";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useMiscellaneousStore, useSupabaseSession } from "../../../store/componentStore";
import {
  type BookmarksCountTypes,
  type CategoriesData,
  type FetchSharedCategoriesData,
} from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import {
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { errorToast } from "../../../utils/toastMessages";
import { CollectionsListSection } from "./collections-list-section";
import { FavoriteCollectionsList } from "./favorite-collections-list";
import { ReorderableListBox } from "./reorderable-list";
import SingleListItemComponent, { type CollectionItemTypes } from "./singleListItemComponent";

const RenderDragPreview = ({ collectionName }: { collectionName: string }) => {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const userId = session?.user?.id;

  const singleCategoryData = find(
    categoryData?.data,
    (item) => item.category_name === collectionName,
  );

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
  const { addCategoryToBookmarkOptimisticMutation } = useAddCategoryToBookmarkOptimisticMutation();
  const { updateCategoryOrderMutation } = useUpdateCategoryOrderOptimisticMutation();
  const { allCategories, isLoadingCategories } = useFetchCategories();
  const { userProfileData } = useFetchUserProfile();
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const { everythingData, isEverythingDataLoading } = useFetchPaginatedBookmarks();
  const { flattenedSearchData } = useSearchBookmarks();

  const flattendPaginationBookmarkData = useMemo(
    () => everythingData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
    [everythingData?.pages],
  );

  const mergedBookmarkData = useMemo(
    () => [...flattendPaginationBookmarkData, ...(flattenedSearchData ?? [])],
    [flattendPaginationBookmarkData, flattenedSearchData],
  );

  const currentPath = useGetCurrentUrlPath();

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, session?.user?.id]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const sharedCategoriesData = queryClient.getQueryData([SHARED_CATEGORIES_TABLE_NAME]) as {
    data: FetchSharedCategoriesData[];
    error: PostgrestError;
  };

  const bookmarksCountData = queryClient.getQueryData([BOOKMARKS_COUNT_KEY, session?.user?.id]) as {
    data: BookmarksCountTypes;
    error: PostgrestError;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBookmarksDrop = async (event: any) => {
    // Guard: don't process drops while bookmarks are still loading
    if (isEverythingDataLoading || !everythingData) {
      return;
    }

    if (event?.isInternal === false) {
      const categoryId = Number.parseInt(event?.target?.key as string, 10);

      const currentCategory =
        find(allCategories?.data, (item) => item?.id === categoryId) ??
        find(allCategories?.data, (item) => item?.id === CATEGORY_ID);
      // only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorised

      const updateAccessCondition =
        find(currentCategory?.collabData, (item) => item?.userEmail === session?.user?.email)
          ?.edit_access === true || currentCategory?.user_id?.id === session?.user?.id;

      // eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-explicit-any
      await event?.items?.forEach(async (item: any) => {
        const bookmarkId = (await item.getText("text/plain")) as string;

        const foundBookmark = find(
          mergedBookmarkData,
          (bookmarkItem) => Number.parseInt(bookmarkId, 10) === bookmarkItem?.id,
        );

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
            category_id: categoryId,
            bookmark_id: Number.parseInt(bookmarkId, 10),
          });
        } else {
          errorToast("You cannot move collaborators uploads");
        }
      });
    }
  };

  const favoriteCategories = userProfileData?.data?.[0]?.favorite_categories ?? [];

  const collectionsList = session
    ? categoryData?.data?.map((item) => ({
        name: item?.category_name,
        href: `/${item?.category_slug}`,
        id: item?.id,
        current: currentPath === item?.category_slug,
        isFavorite: favoriteCategories.includes(item?.id),
        isPublic: item?.is_public,
        isCollab: !isEmpty(
          find(sharedCategoriesData?.data, (cat) => cat?.category_id === item?.id),
        ),
        iconValue: item?.icon,
        count: find(
          bookmarksCountData?.data?.categoryCount,
          (catItem) => catItem?.category_id === item?.id,
        )?.count,
        iconColor: item?.icon_color,
      }))
    : [];
  const sortedList = () => {
    let array: CollectionItemTypes[] = [];
    if (!isEmpty(userProfileData?.data)) {
      const apiCategoryOrder = userProfileData?.data?.[0].category_order;

      if (!isNull(apiCategoryOrder)) {
        if (apiCategoryOrder) {
          for (const item of apiCategoryOrder) {
            const data = find(collectionsList, (dataItem) => dataItem?.id === item);

            if (data) {
              array = [...array, data];
            }
          }
        }

        let categoriesNotThereInApiCategoryOrder: CollectionItemTypes[] = [];

        if (collectionsList) {
          for (const item of collectionsList) {
            const data = find(apiCategoryOrder, (dataItem) => dataItem === item?.id);

            if (!data) {
              categoriesNotThereInApiCategoryOrder = [
                ...categoriesNotThereInApiCategoryOrder,
                item,
              ];
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
